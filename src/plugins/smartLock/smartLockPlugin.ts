import {
RentMaikarPlugin
}
from "../pluginTypes";


export const SmartLockPlugin:
RentMaikarPlugin={


id:"smartLock",

name:"Smart Vehicle Locks",

enabled:false,


async initialize(){

console.log(
"Smart locks enabled"
);

},


async deactivate(){

console.log(
"Smart locks disabled"
);

},


async processEvent(event){

if(
event.type==="lock"
){

console.log(
"Lock event",
event.payload
);

}

}

};
