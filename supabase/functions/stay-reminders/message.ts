export function reminderMessage(message: Record<string, unknown>) {
  const name=String(message.dogName || 'Your dog');
  const pickup=message.kind==='pickup';
  const time=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(String(message.eventAt)));
  const subject=pickup?`${name}'s pickup is within 24 hours`:`${name}'s boarding stay is coming up`;
  const payment=pickup&&!message.paid?'If you have an outstanding balance, please arrange payment with the kennel before pickup. Contact the kennel for the final amount and payment instructions. If you have already paid, thank you—no further payment is needed.':'';
  const text=[pickup?`A friendly reminder: ${name} is scheduled for pickup within the next 24 hours.`:`We look forward to welcoming ${name}! Your approved boarding stay starts within the next 24 hours.`,
    `${pickup?'Pickup':'Drop-off'}: ${time}`,`Stay: ${String(message.requestCode || '')}`,payment,
    pickup?'Please remember to collect your dog’s belongings.':'Please check your dog’s vaccination records and bring their food and care instructions.',
    'View your stay: https://kennel.centraltexashusky.com/#customerRequestsPage',
    'Need to change your plans? Contact Central Texas Husky.', 'Snuggle Stay · Central Texas Husky'].filter(Boolean).join('\n\n');
  const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const html=`<div style="background:#f5f8fb;padding:28px;font-family:Arial,sans-serif;color:#12314e"><div style="max-width:580px;margin:auto;background:white;padding:28px;border:1px solid #dae4ed;border-radius:8px"><p style="color:#526b82">Snuggle Stay · Central Texas Husky</p><h1 style="font-size:25px">${escape(subject)}</h1>${text.split('\n\n').filter(p=>!p.startsWith('View your stay:')&&!p.startsWith('Snuggle Stay')).map(p=>`<p style="line-height:1.6">${escape(p)}</p>`).join('')}<a href="https://kennel.centraltexashusky.com/#customerRequestsPage" style="display:inline-block;background:#0869aa;color:white;padding:14px 20px;border-radius:6px;text-decoration:none">View my stay</a></div></div>`;
  return {subject,text,html};
}
