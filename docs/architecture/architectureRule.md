Architecture Rule

Persona and Hologram must never directly call each other's services.

Communication between the two systems should occur only through platform-level business workflows when required.

Identity verification must remain independent of IoT connectivity.

IoT connectivity must remain independent of user verification.

RentMaikar/
├── docs/
│   └── architecture/
│       ├── Hologram-Persona-Separation.md
│       ├── HologramResponsibilities.md
│       ├── PersonaResponsibilities.md
│       ├── IdentityVerificationArchitecture.md
│       └── architectureRule.md
├── architecture/
│   ├── architecture.txt
│   └── resident-ochestrator.md
├── src/
│   ├── services/
│   │   ├── residentOrchestrator.ts
│   │   ├── traccarBridge.ts
│   │   ├── mqttBridge.ts
│   │   └── resident-ochestrator/types.ts
│   └── plugins/
│       ├── pluginManager.ts
│       ├── pluginTypes.ts
│       ├── evBattery/evBatteryPlugin.ts
│       └── obd/obdPlugin.ts
└── supabase/

