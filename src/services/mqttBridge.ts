import orchestrator
from "./residentOrchestrator";


export function receiveMQTTMessage(
 topic:string,
 message:any
){


 const parts =
 topic.split("/");


 const vehicleId =
 parts[2];


 const event={

   vehicleId,

   source:"mqtt",

   eventType:
   "telemetry",

   timestamp:
   new Date()
   .toISOString(),

   payload:message

 };


 return orchestrator
 .processEvent(event);

}
