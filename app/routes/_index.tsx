import { Link } from "react-router";

export const meta = () => [
  { title: "KERNIQ — Offers engineered for profit" },
  { name: "description", content: "Product relationships, contribution economics, and controlled offer measurement for Shopify." },
];

function Mark() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" className="brand-mark">
    <path d="M24 4 42 15v18L24 44 6 33V15L24 4Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M24 4v13m18-2-12 7m12 11-12-7M24 44V30M6 33l12-7M6 15l12 7m6-5v13" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="24" cy="24" r="4" fill="currentColor"/>
    <circle cx="24" cy="4" r="2.2" fill="currentColor"/><circle cx="42" cy="15" r="2.2" fill="currentColor"/>
    <circle cx="42" cy="33" r="2.2" fill="currentColor"/><circle cx="24" cy="44" r="2.2" fill="currentColor"/>
    <circle cx="6" cy="33" r="2.2" fill="currentColor"/><circle cx="6" cy="15" r="2.2" fill="currentColor"/>
  </svg>;
}

export default function Home() {
  return <div className="marketing">
    <nav className="site-nav"><Link to="/" className="brand"><Mark/><span>KERNIQ</span></Link><div className="nav-links"><a href="#method">Method</a><a href="#platform">Platform</a><a href="#pricing">Pricing</a></div><Link to="/app" className="nav-cta">Merchant login <span>↗</span></Link></nav>
    <main>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">PROFIT INTELLIGENCE FOR SHOPIFY</p><h1>Every offer<br/><em>should earn</em><br/>its place.</h1><p className="hero-lede">Turn product relationships into offers with clear economics. Protect contribution margin. Measure what actually changes buyer behaviour.</p><div className="hero-actions"><a className="button button-primary" href="#platform">Explore the platform</a><a className="text-link" href="#method">How it works <span>↘</span></a></div><p className="hero-footnote">Built for operators who care about profit, not just order value.</p></div>
        <div className="hero-visual"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="visual-core"><Mark/><span>CONTRIBUTION<br/>INTELLIGENCE</span></div><div className="node node-a">PRODUCT<br/>AFFINITY</div><div className="node node-b">MARGIN<br/>GUARDRAILS</div><div className="node node-c">INCREMENTAL<br/>MEASUREMENT</div><div className="visual-caption">DECISION SYSTEM / 01</div></div>
      </section>
      <section className="statement" id="method"><p className="eyebrow">THE KERNIQ METHOD</p><h2>Revenue is a signal.<br/><em>Contribution is the decision.</em></h2><p>More revenue can still mean less profit. KERNIQ connects what customers buy, what those products cost, and which offers produce measurable value.</p></section>
      <section className="platform-section" id="platform"><div className="section-heading"><p className="eyebrow">ONE CONNECTED SYSTEM</p><h2>From product data<br/>to better decisions.</h2></div><div className="feature-grid">
        <article><span>01 / DISCOVER</span><h3>Product relationships</h3><p>Find products that appear together in real order history. Rank affinity with support, confidence, and lift.</p></article>
        <article><span>02 / PROTECT</span><h3>Contribution economics</h3><p>Evaluate discounts and offers against known variable costs. Unknown costs stay unknown.</p></article>
        <article><span>03 / DEPLOY</span><h3>Offer orchestration</h3><p>Design relevant offers with eligibility, placement, exclusions, and margin constraints.</p></article>
        <article><span>04 / MEASURE</span><h3>Incrementality</h3><p>Separate attributed sales from incremental lift. Use controlled experiments before claiming causation.</p></article>
      </div></section>
      <section className="principle"><div><p className="eyebrow">A STRICTER STANDARD</p><h2>No invented margins.<br/>No vanity metrics.<br/><em>No false lift.</em></h2></div><p>KERNIQ is designed to show its working. Every recommendation should expose its evidence, assumptions, cost coverage, and limits. If the data cannot support a conclusion, the product should say so.</p></section>
      <section className="pricing-section" id="pricing"><p className="eyebrow">STRAIGHTFORWARD SUBSCRIPTIONS</p><h2>Choose the operating range.</h2><div className="pricing-grid">
        <article className="plan-card"><p className="eyebrow">LAUNCH</p><h3>$29<span> / month</span></h3><p>Core product intelligence and offer management.</p><Link to="/app/billing">Continue in Shopify ↗</Link></article>
        <article className="plan-card plan-featured"><p className="eyebrow">GROWTH</p><h3>$79<span> / month</span></h3><p>Advanced experimentation and higher operating limits.</p><Link to="/app/billing">Continue in Shopify ↗</Link></article>
        <article className="plan-card"><p className="eyebrow">SCALE</p><h3>$149<span> / month</span></h3><p>Expanded limits and advanced analytics.</p><Link to="/app/billing">Continue in Shopify ↗</Link></article>
      </div><p className="pricing-note">Subscriptions are billed through Shopify. Plan limits and feature entitlements are enforced in the application.</p></section>
    </main>
    <footer className="site-footer"><Link to="/" className="brand"><Mark/><span>KERNIQ</span></Link><span>Offers engineered for profit.</span><span>© {new Date().getFullYear()} KERNIQ</span></footer>
  </div>;
}
