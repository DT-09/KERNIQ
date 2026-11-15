import { Link } from "react-router";

export const meta = () => [
  { title: "KERNIQ — Profit-aware commerce decisions" },
  { name: "description", content: "Turn Shopify order history and known product costs into evidence-led product recommendations, margin guardrails, and merchant-controlled cart offers." },
  { name: "robots", content: "index,follow" },
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

const proofRows = [
  { label: "Order history", value: "Observed", detail: "Pairs are calculated from synced Shopify orders." },
  { label: "Unit costs", value: "Source-linked", detail: "Shopify unit costs are used when available." },
  { label: "Operating costs", value: "Merchant-defined", detail: "Fees, fulfillment, and shipping assumptions stay editable." },
  { label: "Missing inputs", value: "Visible", detail: "Incomplete economics are never presented as verified profit." },
];

export default function Home() {
  return <div className="marketing">
    <nav className="site-nav">
      <Link to="/" className="brand"><Mark/><span>KERNIQ</span></Link>
      <div className="nav-links"><a href="#system">System</a><a href="#evidence">Evidence</a><a href="#pricing">Pricing</a></div>
      <Link to="/login" className="nav-cta">Open merchant app <span>↗</span></Link>
    </nav>
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">COMMERCE INTELLIGENCE / SHOPIFY</p>
          <h1>Make every<br/><em>recommendation</em><br/>earn its place.</h1>
          <p className="hero-lede">KERNIQ turns your store's order history and product costs into useful product relationships, contribution guardrails, and cart recommendations you control.</p>
          <div className="hero-actions"><Link className="button button-primary" to="/login">Connect a Shopify store <span>↗</span></Link><a className="text-link" href="#system">Explore the method <span>↓</span></a></div>
          <p className="hero-footnote">BUILT AROUND OBSERVED DATA. DESIGNED FOR MERCHANT CONTROL.</p>
        </div>
        <div className="hero-visual" aria-label="KERNIQ decision workflow illustration">
          <div className="visual-topline"><span>DECISION MODEL / 001</span><span>LIVE DATA REQUIRED</span></div>
          <div className="visual-orbit orbit-one"></div><div className="visual-orbit orbit-two"></div>
          <div className="visual-core"><Mark/><span>PROFIT<br/>INTELLIGENCE</span></div>
          <div className="signal-card signal-a"><span>01 / OBSERVE</span><strong>Order patterns</strong><small>What customers buy together</small></div>
          <div className="signal-card signal-b"><span>02 / QUALIFY</span><strong>Cost coverage</strong><small>What the economics can support</small></div>
          <div className="signal-card signal-c"><span>03 / ACT</span><strong>Merchant review</strong><small>What reaches the storefront</small></div>
          <div className="visual-foot">NO SILENT PUBLISHING <i></i> NO INVENTED COSTS</div>
        </div>
      </section>

      <section className="proof-strip" id="evidence">
        <div className="proof-intro"><p className="eyebrow">THE EVIDENCE STANDARD</p><h2>Know what is known.<br/><em>See what is missing.</em></h2></div>
        <div className="proof-list">{proofRows.map((row) => <article className="proof-row" key={row.label}><span>{row.label}</span><strong>{row.value}</strong><small>{row.detail}</small></article>)}</div>
      </section>

      <section className="platform-section" id="system">
        <div className="section-heading"><div><p className="eyebrow">ONE OPERATING SYSTEM</p><h2>From raw store data<br/>to a reviewed action.</h2></div><p>Four connected jobs. One clear chain of evidence.</p></div>
        <div className="feature-grid">
          <article><span>01 / DISCOVER</span><h3>Product relationships</h3><p>Find products that appear together in real order history. Compare support, confidence, and lift without confusing association with causation.</p></article>
          <article><span>02 / UNDERSTAND</span><h3>Contribution visibility</h3><p>Combine Shopify unit costs with merchant-defined payment fees, fulfillment, and shipping assumptions. Unknown inputs remain unknown.</p></article>
          <article><span>03 / ORCHESTRATE</span><h3>Controlled cart offers</h3><p>Create recommendation drafts, review the selected product, then activate or pause the offer from the merchant app.</p></article>
          <article><span>04 / LEARN</span><h3>Engagement evidence</h3><p>Inspect recorded impressions and add-to-cart submissions. These are engagement signals, not proof of incremental revenue.</p></article>
        </div>
      </section>

      <section className="method-section">
        <div><p className="eyebrow">THE KERNIQ METHOD</p><h2>Revenue is a signal.<br/><em>Evidence is the standard.</em></h2><p>More revenue can still mean less contribution. KERNIQ separates observed order behaviour from estimated economics, and both from causal claims.</p></div>
        <div className="method-steps">
          <div><b>01</b><span><strong>Connect</strong><small>Sync products, variants, unit costs, and available recent orders.</small></span></div>
          <div><b>02</b><span><strong>Qualify</strong><small>Review product affinity and fill in the operating costs your store knows.</small></span></div>
          <div><b>03</b><span><strong>Deploy</strong><small>Create a draft, configure the theme block, and activate it deliberately.</small></span></div>
          <div><b>04</b><span><strong>Inspect</strong><small>Review observed engagement and data readiness before making the next decision.</small></span></div>
        </div>
      </section>

      <section className="integrity-section">
        <div><p className="eyebrow">BUILT-IN RESTRAINT</p><h2>Profit claims need<br/><em>complete inputs.</em></h2></div>
        <div className="integrity-copy"><p>KERNIQ does not manufacture certainty. If product cost, payment fees, fulfillment, or shipping assumptions are missing, contribution profit stays unavailable. A product pair is an observed relationship. An offer impression is an engagement event. Neither is described as incremental lift.</p><ul><li>Integer minor-unit monetary calculations</li><li>Store-scoped records and merchant authentication</li><li>Draft-first offers with explicit activation</li><li>Visible sync status and recorded failures</li></ul></div>
      </section>

      <section className="pricing-section" id="pricing">
        <p className="eyebrow">SHOPIFY-BILLED SUBSCRIPTIONS</p><h2>Choose the operating range.</h2>
        <p className="pricing-intro">Start with the order history and offer capacity your store needs. Subscription checkout and billing are handled inside Shopify.</p>
        <div className="pricing-grid">
          <article className="plan-card"><p className="eyebrow">LAUNCH</p><h3>$29<span> / month</span></h3><p>3 cart offers · up to 1,000 recent orders analyzed.</p><Link to="/login">Connect store ↗</Link></article>
          <article className="plan-card plan-featured"><p className="eyebrow">GROWTH / MOST CAPACITY</p><h3>$79<span> / month</span></h3><p>15 cart offers · up to 3,000 recent orders analyzed.</p><Link to="/login">Connect store ↗</Link></article>
          <article className="plan-card"><p className="eyebrow">SCALE</p><h3>$149<span> / month</span></h3><p>50 cart offers · up to 5,000 recent orders analyzed.</p><Link to="/login">Connect store ↗</Link></article>
        </div>
        <p className="pricing-note">Plan entitlements are enforced in the application. A 7-day trial is offered through Shopify billing where configured.</p>
      </section>
      <section className="closing-cta"><div><p className="eyebrow">START WITH YOUR STORE'S OWN DATA</p><h2>Make the next offer<br/><em>a measured decision.</em></h2></div><Link className="button button-primary" to="/login">Connect Shopify <span>↗</span></Link></section>
    </main>
    <footer className="site-footer"><Link to="/" className="brand"><Mark/><span>KERNIQ</span></Link><span>Profit-aware commerce decisions.</span><span>© {new Date().getFullYear()} KERNIQ</span></footer>
  </div>;
}
