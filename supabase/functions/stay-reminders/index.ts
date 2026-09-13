import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {reminderMessage} from './message.ts';
// Custom scheduler authentication is mandatory even when platform JWT checking is disabled.
Deno.serve(async req=>{
  const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
  if(req.method!=='POST')return json({error:'POST required'},405);
  const token=req.headers.get('x-reminder-token') || '';
  if(!/^[a-f0-9]{64}$/.test(token))return json({error:'Unauthorized'},401);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!).schema('cuddle_stay');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const config=await db.from('stay_reminder_config').select('token_hash,enabled').eq('id',true).single();
  if(config.error||config.data.token_hash!==hash)return json({error:'Unauthorized'},401);
  const body=await req.json().catch(()=>({}));
  if(body.dryRun===true){const result=await db.rpc('stay_reminder_candidates');return result.error?json({error:result.error.message},500):json({dryRun:true,eligible:result.data.length,enabled:config.data.enabled,emailConfigured:!!(Deno.env.get('RESEND_API_KEY')&&Deno.env.get('ALERT_FROM_EMAIL'))});}
  if(!config.data.enabled)return json({enabled:false,sent:0});
  const apiKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('ALERT_FROM_EMAIL');
  if(!apiKey||!from)return json({error:'Email provider is not configured'},503);
  const claimed=await db.rpc('claim_stay_reminders');
  if(claimed.error)return json({error:claimed.error.message},500);
  let sent=0,failed=0,cancelled=0;
  for(const job of claimed.data || []){
    try{
      // Recheck live eligibility immediately before sending; never trust a stale queued date/status.
      const current=await db.rpc('stay_reminder_candidates');
      if(current.error)throw new Error('Eligibility recheck failed');
      const candidate=current.data.find((r:{id:string})=>r.id===job.id);
      if(!candidate){await db.from('stay_reminder_outbox').update({status:'cancelled',locked_until:null}).eq('id',job.id);cancelled++;continue;}
      // Lock message on first attempt for provider idempotency. If paid meanwhile, suppress an unsent nudge.
      if(job.attempts===1){job.message=candidate.message;const saved=await db.from('stay_reminder_outbox').update({message:job.message}).eq('id',job.id);if(saved.error)throw new Error('Message snapshot save failed');}
      else if(candidate.message.paid&&!job.message.paid){await db.from('stay_reminder_outbox').update({status:'cancelled',last_error:'Payment recorded during retry'}).eq('id',job.id);cancelled++;continue;}
      const message=reminderMessage(job.message);
      const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`stay-reminder/${job.id}`},body:JSON.stringify({from,to:[job.recipient],...message})});
      const result=await response.json();
      if(!response.ok)throw new Error(`Email provider status ${response.status}`);
      const saved=await db.from('stay_reminder_outbox').update({status:'sent',sent_at:new Date().toISOString(),provider_id:result.id,locked_until:null,last_error:null}).eq('id',job.id);
      if(saved.error)throw new Error('Delivery receipt save failed');
      sent++;
    }catch(error){failed++;await db.from('stay_reminder_outbox').update({status:'pending',last_error:error instanceof Error?error.message:'Delivery failed',locked_until:new Date(Date.now()+15*60*1000).toISOString()}).eq('id',job.id);}
  }
  console.log('stay_reminders_run',{sent,failed,cancelled});
  return json({sent,failed,cancelled});
});
