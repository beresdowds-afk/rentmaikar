import {
RentMaikarPlugin
}
from "../pluginTypes";


export const FuelSensorPlugin:
RentMaikarPlugin={


id:"fuelSensor",

name:"Fuel Sensor Monitoring",

enabled:false,


async initialize(){

console.log(
"Fuel sensors enabled"
);

},


async deactivate(){

console.log(
"Fuel sensors disabled"
);

},


async processEvent(event){

if(
event.type==="fuel"
){

console.log(
event.payload
);

}

}

};
