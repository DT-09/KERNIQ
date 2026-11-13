(() => {
  const endpoint = "/apps/kerniq/events";
  const seen = new WeakSet();

  function send(block, eventType) {
    const productShopifyId = block.dataset.productId;
    if (!productShopifyId || !window.crypto?.randomUUID) return;
    const payload = {
      eventKey: window.crypto.randomUUID(),
      eventType,
      productShopifyId,
      offerId: block.dataset.offerId || null,
    };
    fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }

  function observe(block) {
    if (seen.has(block)) return;
    seen.add(block);
    const form = block.querySelector("form");
    if (form) {
      form.addEventListener("submit", () => send(block, "add_to_cart"), { capture: true });
    }
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

  function scan(root) {
    if (root.matches?.(".kerniq-cart-offer")) observe(root);
    root.querySelectorAll?.(".kerniq-cart-offer").forEach(observe);
  }

  scan(document);
  document.addEventListener("shopify:section:load", (event) => scan(event.target));
})();
