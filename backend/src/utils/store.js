/**
 * FASHION HUB — Central Store Configuration
 * Update this file to change store info everywhere in the app.
 */

export const STORE = {
  name:        "FASHION HUB",
  tagline:     "STYLE. QUALITY. YOU.",
  category:    "Men's Premium Fashion",

  address:     "Main Road Mairwa, Near Nahar Bridge, South of HDFC Bank",
  addressHindi: "मेन रोड मैरवा, नहर पुल के पास, HDFC बैंक से दक्षिण",
  city:        "Mairwa",
  state:       "Bihar",
  pincode:     "841437",

  phone:       "+91 82923 99080",
  whatsapp:    "+91 82923 99080",
  instagram:   "@fashionhub9080",
  email:       "fashionhub9080@gmail.com",

  gstin:       "27ABCDE1234F1Z5",  // replace with actual GSTIN when available

  brands: [
    "Levi's", "Nike", "U.S. Polo Assn.", "Adidas", "Mufti",
    "Allen Solly", "H&M", "Pepe Jeans", "Puma", "Spykar",
    "Blackberrys", "Jockey", "Bear House", "Peter England",
  ],
};

/** Compact one-line address for receipts and invoices */
export const STORE_ADDRESS_SHORT = `${STORE.address}, ${STORE.city} - ${STORE.pincode}`;

/** Invoice / receipt store snapshot (saved on every sale) */
export const STORE_SNAPSHOT = {
  name:        STORE.name,
  tagline:     STORE.tagline,
  address:     STORE_ADDRESS_SHORT,
  phone:       STORE.phone,
  whatsapp:    STORE.whatsapp,
  email:       STORE.email,
  instagram:   STORE.instagram,
  gstin:       STORE.gstin,
};
