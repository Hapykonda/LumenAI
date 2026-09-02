import AutoConfigClient from "./AutoConfigClient";
import CampaignsPage from "../campaigns/page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return view === "campaigns" ? <CampaignsPage /> : <AutoConfigClient />;
}
