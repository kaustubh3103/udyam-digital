import React from "react";
import {
  ShoppingBasket, Pill, Scissors, Croissant, Candy, Smartphone, Shirt, PencilRuler, Wrench, Glasses,
  Smile, FlaskConical, Activity, Calculator, Scale, GraduationCap, Plane, DraftingCompass, Home, Shield,
  Utensils, Tv, Hospital, Cake, Dumbbell, Baby, Hotel, Layers, Cog, Package, Printer, Armchair, Wheat,
  CreditCard, MessageCircle, Cctv, Wifi, Receipt, Mail, DatabaseBackup, ShieldCheck, RefreshCw, PhoneCall,
  Globe, MessageSquareText, Building2, Truck, Network, Store, CircleHelp, Briefcase, Factory,
} from "lucide-react";

// One consistent line-icon family, drawn in a tinted tile. Customers see a picture and a word,
// never a product code.
const BIZ = {
  "Kirana store": ShoppingBasket, Pharmacy: Pill, Salon: Scissors, Bakery: Croissant, "Sweet shop": Candy,
  "Mobile repair shop": Smartphone, Boutique: Shirt, "Stationery shop": PencilRuler, "Hardware store": Wrench,
  Optician: Glasses, "Dental clinic": Smile, "Diagnostic lab": FlaskConical, "Physiotherapy clinic": Activity,
  "CA firm": Calculator, "Law office": Scale, "Coaching centre": GraduationCap, "Travel agency": Plane,
  "Architecture studio": DraftingCompass, "Real estate agency": Home, "Insurance agency": Shield,
  "Restaurant chain": Utensils, "Electronics retail chain": Tv, "Pharmacy chain": Hospital,
  "Apparel retail chain": Shirt, "Bakery chain": Cake, "Gym chain": Dumbbell, "Pre-school chain": Baby,
  "Budget hotel group": Hotel, "Textile unit": Layers, "Auto-parts unit": Cog, "Plastic moulding unit": Package,
  "Packaging unit": Package, "Printing press": Printer, "Furniture workshop": Armchair, "Food processing unit": Wheat,
  "Other shop or service": Store, "Other office or clinic": Briefcase, "Other multi-branch business": Building2, "Other factory or workshop": Factory,
};
const NEED = {
  payments: CreditCard, whatsapp: MessageCircle, cctv: Cctv, guestwifi: Wifi, billing: Receipt, email: Mail,
  backup: DatabaseBackup, security: ShieldCheck, uptime: RefreshCw, calls: PhoneCall, website: Globe,
  sms: MessageSquareText, branches: Building2, machines: Cog, vehicles: Truck, staticip: Network,
};

export function Tile({ as: Icon = Store, size = 22, tone = "brand" }) {
  return (
    <span className={"tile " + tone} aria-hidden="true">
      <Icon size={size} strokeWidth={1.75} />
    </span>
  );
}
export const BizIcon = ({ type, size }) => <Tile as={BIZ[type] || Store} size={size} />;
export const NeedIcon = ({ id, size }) => <Tile as={NEED[id] || CircleHelp} size={size} />;
export { CircleHelp };
