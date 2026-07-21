// Hologram API Client
// Supabase Edge Function compatible

const BASE = "https://dashboard.hologram.io/api/1";

function creds() {
  const apiKey = Deno.env.get("HOLOGRAM_API_KEY");
  const orgId = Deno.env.get("HOLOGRAM_ORG_ID");

  console.log("Hologram API Key loaded:", !!apiKey);
  console.log("Hologram Org ID loaded:", !!orgId);

  if (!apiKey || !orgId) {
    return null;
  }

  return {
    apiKey,
    orgId,
  };
}


async function call(path: string, init: RequestInit = {}) {

  const c = creds();

  if (!c) {
    return {
      ok: false as const,
      reason: "not_configured" as const,
    };
  }


  const response = await fetch(
    `${BASE}${path}`,
    {
      ...init,
      headers: {
        Authorization:
          "Basic " + btoa(`apikey:${c.apiKey}`),

        Accept: "application/json",

        "Content-Type":
          "application/json",

        ...(init.headers || {}),
      },
    }
  );


  const body =
    await response
      .json()
      .catch(() => ({}));


  if (!response.ok) {

    console.error(
      "Hologram API Error",
      response.status,
      body
    );

    return {
      ok:false as const,
      reason:"provider_error" as const,
      status:response.status,
      body,
    };
  }


  return {
    ok:true as const,
    body,
  };
}



export const hologram = {


  isConfigured() {
    return !!creds();
  },


  listSims(limit = 50) {

    return call(
      `/links/cellular?limit=${limit}`
    );

  },


  getSim(simId:string) {

    return call(
      `/links/cellular/${simId}`
    );

  },


  activateSim(
    simId:string,
    planId:number
  ){

    return call(
      `/links/cellular/${simId}/state`,
      {
        method:"POST",
        body:JSON.stringify({
          state:"live",
          plan:planId,
        }),
      }
    );

  },


  suspendSim(simId:string){

    return call(
      `/links/cellular/${simId}/state`,
      {
        method:"POST",
        body:JSON.stringify({
          state:"pause",
        }),
      }
    );

  },


  getSimUsage(simId:string){

    return call(
      `/links/cellular/${simId}/usage`
    );

  },
