import WidgetClient from "../WidgetClient";

export default function Page({ params }: { params: { key: string } }) {
  return <WidgetClient publicKey={params.key ?? ""} />;
}