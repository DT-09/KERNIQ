(() => {
  const roots = document.querySelectorAll("[data-kerniq-recommendation]:not([data-kerniq-ready])");

  for (const root of roots) {
    root.setAttribute("data-kerniq-ready", "true");
    const offerId = root.getAttribute("data-offer-id") || "";
    const content = root.querySelector(".kerniq-recommendation__content");
    if (!content || !offerId) {
      root.hidden = true;
      continue;
    }

    fetch("/apps/kerniq?offer_id=" + encodeURIComponent(offerId), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    })
      .then((response) => {
        if (!response.ok) throw new Error("Recommendation unavailable");
        return response.json();
      })
      .then((payload) => {
        if (!payload || !payload.product || !payload.product.handle || !payload.product.title) {
          throw new Error("Invalid recommendation");
        }

        content.replaceChildren();
        const card = document.createElement("article");
        card.className = "kerniq-recommendation__card";

        if (typeof payload.product.imageUrl === "string") {
          try {
            const imageUrl = new URL(payload.product.imageUrl);
            if (imageUrl.protocol === "https:") {
              const image = document.createElement("img");
              image.src = imageUrl.href;
              image.alt = payload.product.title;
              image.loading = "lazy";
              image.className = "kerniq-recommendation__image";
              card.append(image);
            }
          } catch {
            // Ignore malformed image URLs; the product link remains usable.
          }
        }

        const details = document.createElement("div");
        details.className = "kerniq-recommendation__details";
        const title = document.createElement("strong");
        title.textContent = payload.product.title;
        const link = document.createElement("a");
        link.href = "/products/" + encodeURIComponent(payload.product.handle);
        link.textContent = "View product";
        link.className = "kerniq-recommendation__link";
        details.append(title, link);
        card.append(details);
        content.append(card);
      })
      .catch(() => {
        root.hidden = true;
      });
  }
})();
