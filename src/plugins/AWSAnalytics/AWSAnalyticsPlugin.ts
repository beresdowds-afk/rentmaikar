import {
RentMaikarPlugin
}
from "../pluginTypes";


export const AWSAnalyticsPlugin:
RentMaikarPlugin={


id:"awsAnalytics",

name:"AWS S3 Athena Analytics",

enabled:false,


async initialize(){

console.log(
"AWS Analytics enabled"
);

},


async deactivate(){

console.log(
"AWS Analytics disabled"
);

},


async processEvent(event){

if(
event.type==="analytics"
){

console.log(
"Sending data to AWS",
event.payload
);

}

}

};
