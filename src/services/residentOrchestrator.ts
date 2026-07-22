import {
  VehicleEvent,
  VehicleState,
  AnalyticsEvent
} from "./types";

class ResidentOrchestrator {

  private vehicleStates:
    Map<string, VehicleState> = new Map();


  processEvent(event: VehicleEvent) {

    const state =
      this.vehicleStates.get(event.vehicleId)
      ||
      {
        vehicleId:event.vehicleId,
        lastUpdate:event.timestamp
      };


    if(event.source==="traccar"){
      this.processTraccar(state,event);
    }


    if(event.source==="mqtt"){
      this.processMQTT(state,event);
    }


    state.lastUpdate = event.timestamp;


    this.vehicleStates.set(
      event.vehicleId,
      state
    );


    this.runAnalytics(state);

    return state;
  }



  private processTraccar(
    state:VehicleState,
    event:VehicleEvent
  ){

    const data=event.payload;


    if(data.latitude)
      state.latitude=data.latitude;


    if(data.longitude)
      state.longitude=data.longitude;


    if(data.speed)
      state.speed=data.speed;


    if(data.ignition!==undefined)
      state.ignition=data.ignition;

  }



  private processMQTT(
    state:VehicleState,
    event:VehicleEvent
  ){

    const data=event.payload;


    if(data.battery)
      state.battery=data.battery;


    if(data.fuel)
      state.fuel=data.fuel;


    if(data.temperature)
      state.temperature=data.temperature;


  }



  private runAnalytics(
    state:VehicleState
  ){

    const events:AnalyticsEvent[]=[];


    if(
      state.speed &&
      state.speed > 120
    ){

      events.push({
        vehicleId:state.vehicleId,
        category:"driver_behavior",
        data:{
          type:"speed_violation",
          speed:state.speed
        }
      });

    }


    if(
      state.temperature &&
      state.temperature > 100
    ){

      events.push({
        vehicleId:state.vehicleId,
        category:"maintenance",
        data:{
          type:"engine_temperature"
        }
      });

    }


    this.publishAnalytics(events);

  }



  private publishAnalytics(
    events:AnalyticsEvent[]
  ){

    events.forEach(event=>{

      console.log(
        "AI ANALYTICS EVENT",
        event
      );

      /*
       Future connection:

       - AI Engine
       - AWS Athena
       - S3 Data Lake
       - Notification Service

      */

    });

  }



  getVehicleState(
    vehicleId:string
  ){

    return this.vehicleStates.get(
      vehicleId
    );

  }


}


export default new ResidentOrchestrator();
