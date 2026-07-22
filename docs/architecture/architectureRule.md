Architecture Rule

Persona and Hologram must never directly call each other's services.

Communication between the two systems should occur only through platform-level business workflows when required.

Identity verification must remain independent of IoT connectivity.

IoT connectivity must remain independent of user verification.

RentMaikar/
├── docs/
│   ├── architecture/
│   │   ├── Hologram-Persona-Separation.md
│   │   ├── HologramResponsibilities.md
│   │   ├── PersonaResponsiblities.md
│   │   └── architectureRule.md
|   |   ├── IdentityVerificationArchitecture
├── supabase/
└── src/
|___ ...
