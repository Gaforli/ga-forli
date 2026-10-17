import { trpc } from "@/providers/trpc";

export default function TemaPage({ t }: { t: (k: string) => string }) {
  const temaQuery = trpc.content.getTema.useQuery();
  const tema = temaQuery.data;

  return (
    <div className="tema-enter">
      <h2 className="ptitle">{t("t_tema")}</h2>
      <p className="sub">{t("s_tema")}</p>
      <div className="temacard">
        <img className="bg" src="assets/tema.jpg" alt="" />
        <div className="veil" />
        <div className="vinner">
          <span className="tlabel">🎯 <span>{t("t_tema")}</span></span>
          <h3>{temaQuery.isLoading ? "…" : (tema?.title ?? "…")}</h3>
          <p>{tema?.tag ?? ""}</p>
        </div>
      </div>
      {temaQuery.isLoading ? (
        <div className="themetxt" style={{ marginTop: 20 }}>
          <div className="sk" style={{ height: 13, width: "100%", marginBottom: 12 }} />
          <div className="sk" style={{ height: 13, width: "92%", marginBottom: 12 }} />
          <div className="sk" style={{ height: 13, width: "96%", marginBottom: 12 }} />
          <div className="sk" style={{ height: 13, width: "70%", marginBottom: 20 }} />
          <div className="sk" style={{ height: 13, width: "100%", marginBottom: 12 }} />
          <div className="sk" style={{ height: 13, width: "88%", marginBottom: 12 }} />
          <div className="sk" style={{ height: 13, width: "55%" }} />
        </div>
      ) : (
      <div className="themetxt" style={{ marginTop: 20 }}>
        {tema?.body?.trim()
          ? (tema.body as string).trim().split(/\n{2,}/).map((par: string, i: number) => (
              <p key={i}>{par.split("\n").map((line: string, j: number) => (
                <span key={j}>{line}{j < par.split("\n").length - 1 && <br />}</span>
              ))}</p>
            ))
          : <>
              <p>🚧 <b>Sezione in preparazione.</b></p>
              <p>Il tema dell'anno sarà pubblicato a breve dal Direttore GA.</p>
            </>}
      </div>
      )}
    </div>
  );
}
