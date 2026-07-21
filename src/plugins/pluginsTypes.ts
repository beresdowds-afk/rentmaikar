import {
RentMaikarPlugin
}
from "./pluginTypes";


class PluginManager {


private plugins:
Map<string,RentMaikarPlugin>
=
new Map();



register(
plugin:RentMaikarPlugin
){

this.plugins.set(
plugin.id,
plugin
);

}



async activate(
id:string
){

const plugin =
this.plugins.get(id);


if(!plugin)
throw new Error(
"Plugin not found"
);


plugin.enabled=true;


await plugin.initialize();


}



async deactivate(
id:string
){

const plugin =
this.plugins.get(id);


if(!plugin)
return;


plugin.enabled=false;


await plugin.deactivate();


}



async process(
event:any
){

for(
const plugin of this.plugins.values()
){

if(plugin.enabled){

await plugin.processEvent(
event
);

}

}

}



getPlugins(){

return Array.from(
this.plugins.values()
)
.map(plugin=>({

id:plugin.id,

name:plugin.name,

enabled:plugin.enabled

}));

}


}


export default new PluginManager();
