import { Console } from "@/components/console";
import { cloudEnabled } from "@/lib/cloud";
export const dynamic = "force-dynamic";
export default function Home() {
  return <Console hosted={cloudEnabled()} />;
}
