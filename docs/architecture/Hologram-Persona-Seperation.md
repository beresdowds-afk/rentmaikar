Refactor: Separate Hologram IoT Platform from Persona Verification
Objective
Refactor the RentMaikar platform so that Hologram is treated exclusively as the IoT/eSIM connectivity provider and Persona is treated exclusively as the identity verification provider.
These two integrations must have completely independent business logic, APIs, workflows, permissions, and user interfaces.
