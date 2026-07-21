import orchestrator
from "./residentOrchestrator";


export function receiveTraccarEvent(
 payload:any
){

 const event={

   vehicleId:
   String(payload.deviceId),

   source:"traccar",

   eventType:
   payload.type || "position",

   timestamp:
   new Date()
   .toISOString(),

   payload

 };


 return orchestrator
 .processEvent(event);

}
