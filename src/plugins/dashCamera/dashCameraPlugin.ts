import {
RentMaikarPlugin
}
from "../pluginTypes";


export const DashCameraPlugin:
RentMaikarPlugin={


id:"dashCamera",

name:"AI Dash Camera",

enabled:false,


async initialize(){

console.log(
"Camera analytics enabled"
);

},


async deactivate(){

console.log(
"Camera analytics disabled"
);

},


async processEvent(event){

if(
event.type==="camera"
){

console.log(
"Camera event",
event.payload
);

}

}

};
