import manager
from "./pluginManager";


import {
OBDPlugin
}
from "./obd/obdPlugin";


import {
EVBatteryPlugin
}
from "./evBattery/evBatteryPlugin";


import {
FuelSensorPlugin
}
from "./fuelSensor/fuelSensorPlugin";


import {
SmartLockPlugin
}
from "./smartLock/smartLockPlugin";


import {
DashCameraPlugin
}
from "./dashCamera/dashCameraPlugin";


import {
AWSAnalyticsPlugin
}
from "./awsAnalytics/awsAnalyticsPlugin";



export function registerPlugins(){


manager.register(
OBDPlugin
);


manager.register(
EVBatteryPlugin
);


manager.register(
FuelSensorPlugin
);


manager.register(
SmartLockPlugin
);


manager.register(
DashCameraPlugin
);


manager.register(
AWSAnalyticsPlugin
);


}
