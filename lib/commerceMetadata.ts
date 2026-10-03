import cloudinary from "@/lib/cloudinary";

const fields = [
  { external_id: "ss_name", label: "LaunchForge product name", type: "string", mandatory: false },
  { external_id: "ss_price", label: "LaunchForge price", type: "string", mandatory: false },
  { external_id: "ss_stock", label: "LaunchForge stock", type: "integer", mandatory: false },
  { external_id: "ss_description", label: "LaunchForge description", type: "string", mandatory: false },
];

export async function ensureCommerceMetadata() {
  let existing: any[] = [];
  try {
    const result: any = await cloudinary.api.list_metadata_fields();
    existing = result?.metadata_fields || [];
  } catch (e) {
    console.error("Metadata list warning", e);
  }
  const ids = new Set(existing.map((x: any) => x.external_id));
  for (const field of fields) {
    if (ids.has(field.external_id)) continue;
    try { await cloudinary.api.add_metadata_field(field as any); }
    catch (e: any) {
      const msg = String(e?.error?.message || e?.message || "");
      if (!/already|exist|duplicate/i.test(msg)) console.error("Metadata bootstrap warning", field.external_id, e);
    }
  }
}

export function livingCreativeUrl(publicId: string) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME || "";
  const safeId = publicId.split("/").map(encodeURIComponent).join("/");
  const t = [
    "$name_md:!ss_name!",
    "$price_md:!ss_price!",
    "$stock_md:!ss_stock!",
    "c_fill,w_1080,h_1080,g_auto",
    "e_gradient_fade,y_0.55",
    "l_text:Arial_58_bold:$(name),co_white/fl_layer_apply,g_south_west,x_64,y_170",
    "l_text:Arial_44_bold:$(price),co_white/fl_layer_apply,g_south_west,x_66,y_108",
    "l_text:Arial_24:Only%20$(stock)%20left,co_white/fl_layer_apply,g_south_west,x_68,y_65",
    "if_$stock_lt_1/l_text:Arial_84_bold:SOLD%20OUT,co_white/fl_layer_apply,g_center/if_end",
    "q_auto,f_auto"
  ].join("/");
  return `https://res.cloudinary.com/${cloud}/image/upload/${t}/${safeId}`;
}
