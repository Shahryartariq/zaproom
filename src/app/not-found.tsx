import Link from "next/link";

export default function NotFound() {
  return (
    <div className="state-screen">
      <div>
        <h1>Nothing here</h1>
        <p>This page doesn&apos;t exist. If someone sent you a room link, check that it was copied in full.</p>
        <Link className="btn primary" href="/">
          Go to the lobby
        </Link>
      </div>
    </div>
  );
}
