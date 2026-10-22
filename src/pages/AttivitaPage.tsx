import { trpc } from "@/providers/trpc";

interface Props {
  t: (k: string) => string;
}

export default function AttivitaPage({ t }: Props) {
  const monthlyQuery = trpc.content.getMonthly.useQuery();
  const image = monthlyQuery.data?.image;

  return (
    <div className="adminwrap">
      <h2 className="ptitle">{t("t_attivita")}</h2>
      <p className="sub">{t("s_attivita")}</p>

      {monthlyQuery.isLoading && (
        <div className="postercard" aria-hidden="true"><div className="sk" style={{ height: 300 }} /></div>
      )}

      {!monthlyQuery.isLoading && image && (
        <div className="postercard" style={{ margin: "0 auto" }}>
          <img src={image} alt={t("t_attivita")} />
        </div>
      )}

      {!monthlyQuery.isLoading && !image && (
        <div className="noevents" style={{ marginTop: 20 }}>{t("attivita_empty")}</div>
      )}
    </div>
  );
}
