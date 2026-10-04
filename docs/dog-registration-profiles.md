# Dog registration profiles

Our Dogs and Boarding Dogs each expose a Registration tab. The summary and separate editor reuse the Dog Shows passport fields and concurrency-checked save store. Missing details can be saved without implying official show registration.

- Owned dogs keep paperwork on the exact ownedDog record.
- Boarding dogs resolve explicit customer/source links to the canonical customerDog. Unlinked dogs retain their own boardingDog profile. Conflicting or missing explicit customer links block editing; names are never used to merge dogs.
- Existing AKC, parentage, DOB, breed and sex fields remain authoritative. Registered certificate names are separate from titled display names.
- showEntryPassport stores owner/breeder/contact details and certificate links. Saving retains source metadata. Show submission snapshots remain append-only and unchanged.
- Imported certificate facts retain the source file URL, page and verification date. Missing current contacts and missing certificates remain pending; import does not mark a profile reviewed or register/pay for any show.

Verification: tools/dog-registration-profile-check.mjs covers canonical links, independent same-name dogs, ambiguous links, safe markup, display-name separation and source retention. Its --serve mode is localhost-only synthetic data. The existing registration-workspace test covers concurrent updates, failed saves, permission checks and immutable entry history.
