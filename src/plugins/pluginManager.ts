import { PluginEvent, RentMaikarPlugin } from "./pluginTypes";

class PluginManager {
  private plugins: Map<string, RentMaikarPlugin> = new Map();

  register(plugin: RentMaikarPlugin) {
    this.plugins.set(plugin.id, plugin);
  }

  async activate(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin) throw new Error(`Plugin not found: ${id}`);
    plugin.enabled = true;
    await plugin.initialize();
  }

  async deactivate(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin) return;
    plugin.enabled = false;
    await plugin.deactivate();
  }

  async process(event: PluginEvent) {
    for (const plugin of this.plugins.values()) {
      if (!plugin.enabled) continue;
      try {
        await plugin.processEvent(event);
      } catch (e) {
        console.warn(`[plugin:${plugin.id}] processEvent failed`, e);
      }
    }
  }

  getPlugins() {
    return Array.from(this.plugins.values()).map((p) => ({
      id: p.id,
      name: p.name,
      enabled: p.enabled,
    }));
  }
}

const pluginManager = new PluginManager();
export default pluginManager;
