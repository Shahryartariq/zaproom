/**
 * Google Analytics 4, only when GA_MEASUREMENT_ID is set. Room ids are replaced with
 * "/r/room" in reported paths so private invite links never reach analytics.
 */
export function Analytics({ id, nonce }: { id: string; nonce?: string }) {
  const config = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(id)},{page_location:location.origin+location.pathname.replace(/^\\/r\\/[^/]+/,'/r/room'),page_title:document.title.replace(/^.*\\| Zaproom$/,'Room | Zaproom')});`;
  return (
    <>
      <script async nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`} />
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: config }} />
    </>
  );
}
