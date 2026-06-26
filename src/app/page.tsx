export default function Home() {
  return (
    <main style={{ fontFamily: "Arial, sans-serif", margin: "48px auto", maxWidth: 760, lineHeight: 1.6 }}>
      <h1>LEO Alert</h1>
      <p>EURUSD signal scanner for Vercel, Twelve Data, and LINE Messaging API.</p>
      <ul>
        <li>
          <code>/api/health</code> checks deployment health.
        </li>
        <li>
          <code>/api/test-line?secret=...</code> sends a test LINE message.
        </li>
        <li>
          <code>/api/scan?secret=...</code> scans EURUSD and pushes a LINE signal when a setup appears.
        </li>
      </ul>
    </main>
  );
}
