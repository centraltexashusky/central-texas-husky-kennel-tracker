// Scoped, authenticated compare-and-swap writes. No optimistic success and no
// replacement of unloaded media/stay arrays with a slim local profile.
const identityFields = ["removed", "status", "dogId", "dogType", "showEventId", "attendanceRole", "ringSchedules", "ringDate", "classEntered", "startDate", "endDate", "showType"];
const profileFields = ["showEntryPassport", "registeredName", "showName", "akcRegistrationNumber", "sireName", "damName", "dateOfBirth", "breed", "breedDescription", "sex", "ownerName", "ownerNames", "ownerEmail", "ownerAddress", "ownerPhone", "breederName", "breederNames", "linkedCustomerDogId", "sourceCustomerDogId", "sourceBoardingDogId"];
const normalize = value => Array.isArray(value) ? value.map(normalize) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value ?? null;
export function assertRegistrationUnchanged(base, fresh, fields = []) {
  if (!fresh || fresh.removed) throw new Error("This record is unavailable or was removed. Reload before continuing.");
  if ([...new Set([...identityFields, ...profileFields, ...fields])].some(key => JSON.stringify(normalize(base[key])) !== JSON.stringify(normalize(fresh[key])))) {
    throw new Error("This record changed on another screen. Reload and review it before saving; nothing was overwritten.");
  }
}
export function createRegistrationStore(deps) {
  async function read(type, base, fields) {
    if (!base?.id || !deps.allowed(type)) throw new Error("You do not have access to save this record.");
    if (deps.local()) {
      const payload = deps.read(type).find(record => record.id === base.id);
      assertRegistrationUnchanged(base, payload, fields);
      return { payload };
    }
    if (!deps.connected()) throw new Error("Cloud connection unavailable. Reconnect before saving.");
    const { data, error } = await deps.timeout(deps.request(db => db.from("kennel_records").select("id,type,payload,updated_at").eq("id", base.id).eq("type", type).maybeSingle()), "Read registration record");
    if (error) throw new Error("Could not read the current cloud record. Reconnect and try again.");
    assertRegistrationUnchanged(base, data?.payload, fields);
    return data;
  }
  return {
    check: (type, base) => read(type, base, ["entryRegistrations", "registrationStatus", "entryUrl", "superintendent", "superintendentUrl"]),
    async save(type, base, patch) {
      const row = await read(type, base, Object.keys(patch));
      const payload = { ...row.payload, ...patch, id: base.id, type, updatedAt: new Date().toISOString() };
      if (deps.local()) { deps.cache(type, payload); return payload; }
      await deps.identity(payload);
      let query = deps.request(db => {
        const update = db.from("kennel_records").update({ payload, updated_at: payload.updatedAt }).eq("id", base.id).eq("type", type);
        return (row.updated_at ? update.eq("updated_at", row.updated_at) : update.is("updated_at", null)).select("payload");
      });
      const { data, error } = await deps.timeout(query, "Save registration record");
      if (error) throw new Error("Cloud save failed. Nothing is marked saved here; reload before retrying.");
      if (!data || data.length !== 1) throw new Error("Another update arrived while saving. Reload and review; nothing was overwritten.");
      deps.cache(type, data[0].payload);
      return data[0].payload;
    },
  };
}
