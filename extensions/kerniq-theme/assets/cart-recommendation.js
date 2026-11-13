(() => {
  const endpoint = "/apps/kerniq/events";
  const seen = new WeakSet();

  function send(block, eventType) {
    const productShopifyId = block.dataset.productId;
    const offerId = block.dataset.offerId;
    if (!productShopifyId || !offerId || !window.crypto?.randomUUID) return;
    const payload = {
      eventKey: window.crypto.randomUUID(),
      eventType,
      productShopifyId,
      offerId,
    };
    fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }

  function attachActiveBlock(block) {
    if (seen.has(block)) return;
    seen.add(block);
    block.hidden = false;
    const form = block.querySelector("form");
    if (form) form.addEventListener("submit", () => send(block, "add_to_cart"), { capture: true });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            send(block, "impression");
            observer.disconnect();
            break;
          }
        }
      }, { threshold: 0.25 });
      observer.observe(block);
    } else {
      send(block, "impression");
    }
  }

  async function initialize(block) {
    if (window.Shopify?.designMode) {
      block.hidden = false;
      return;
    }
    const offerId = block.dataset.offerId;
    if (!offerId) return;
    try {
      const response = await fetch(`${endpoint}?offerId=${encodeURIComponent(offerId)}`, {
        credentials: "same-origin",
        headers: { "Accept": "application/json" },
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result.active === true) attachActiveBlock(block);
    } catch {
      // Fail closed: a failed status check leaves the offer hidden.
    }
  }

  function scan(root) {
    if (root.matches?.(".kerniq-cart-offer")) initialize(root);
    root.querySelectorAll?.(".kerniq-cart-offer").forEach(initialize);
  }

  scan(document);
  document.addEventListener("shopify:section:load", (event) => scan(event.target));
})();
