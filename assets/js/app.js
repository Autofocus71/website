(() => {
  "use strict";

  const header = document.querySelector("[data-header]");
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".site-nav");

  const closeMenu = () => {
    navigation.classList.remove("open");
    menuButton.classList.remove("active");
    menuButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  };

  menuButton.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");
    menuButton.classList.toggle("active", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
  });

  navigation
    .querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", closeMenu));

  window.addEventListener(
    "scroll",
    () => header.classList.toggle("scrolled", window.scrollY > 30),
    { passive: true },
  );

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    document
      .querySelectorAll(".reveal")
      .forEach((element) => observer.observe(element));
  } else {
    document
      .querySelectorAll(".reveal")
      .forEach((element) => element.classList.add("visible"));
  }

  document.querySelectorAll("[data-service]").forEach((link) => {
    link.addEventListener("click", () => {
      const requestedService = link.dataset.service;
      const serviceInput = Array.from(
        document.querySelectorAll('input[name="service"]'),
      ).find((input) => input.value === requestedService);

      if (serviceInput) {
        serviceInput.checked = true;
      }
    });
  });

  const form = document.getElementById("project-form");
  const status = form.querySelector(".form-status");
  const recipient = form.dataset.recipient;

  const createDraft = () => {
    if (!form.reportValidity()) {
      return null;
    }

    const data = new FormData(form);
    const service = String(data.get("service") || "Photo");
    const vehicle = String(data.get("vehicle") || "").trim();

    return {
      subject: `Demande ${service} — ${vehicle}`,
      body: [
        "Bonjour Autofocus,",
        "",
        `Je souhaite échanger au sujet d'une prestation ${service}.`,
        "",
        `Nom : ${String(data.get("name") || "").trim()}`,
        `Contact : ${String(data.get("contact") || "").trim()}`,
        `Véhicule : ${vehicle}`,
        `Lieu / période : ${
          String(data.get("locationDate") || "").trim() || "Non précisé"
        }`,
        "",
        "Détails de ma demande :",
        String(data.get("details") || "").trim() ||
          "Aucune précision supplémentaire",
        "",
        "Merci.",
      ].join("\n"),
    };
  };

  const createMailtoUrl = (draft) => {
    const subject = encodeURIComponent(draft.subject);
    const body = encodeURIComponent(draft.body);

    return `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const draft = createDraft();

    if (!draft) {
      return;
    }

    status.textContent =
      "Votre application mail va s'ouvrir avec la demande préremplie.";
    window.location.href = createMailtoUrl(draft);
  });

  form
    .querySelector('[data-provider="gmail"]')
    .addEventListener("click", () => {
      const draft = createDraft();

      if (!draft) {
        return;
      }

      const parameters = new URLSearchParams({
        view: "cm",
        fs: "1",
        to: recipient,
        su: draft.subject,
        body: draft.body,
      });

      status.textContent = "Gmail s'ouvre dans un nouvel onglet.";
      window.open(
        `https://mail.google.com/mail/?${parameters}`,
        "_blank",
        "noopener,noreferrer",
      );
    });

  form
    .querySelector('[data-provider="outlook"]')
    .addEventListener("click", () => {
      const draft = createDraft();

      if (!draft) {
        return;
      }

      const parameters = new URLSearchParams({
        to: recipient,
        subject: draft.subject,
        body: draft.body,
      });

      status.textContent = "Outlook s'ouvre dans un nouvel onglet.";
      window.open(
        `https://outlook.office.com/mail/deeplink/compose?${parameters}`,
        "_blank",
        "noopener,noreferrer",
      );
    });

  const galleryCards = Array.from(document.querySelectorAll(".gallery-card"));
  const lightbox = document.querySelector("[data-gallery-lightbox]");

  if (lightbox && galleryCards.length) {
    const lightboxImage = lightbox.querySelector("[data-lightbox-image]");
    const lightboxStage = lightbox.querySelector(".lightbox-stage");
    const lightboxNumber = lightbox.querySelector("[data-lightbox-number]");
    const lightboxMeta = lightbox.querySelector("[data-lightbox-meta]");
    const lightboxTitle = lightbox.querySelector("[data-lightbox-title]");
    const lightboxLocation = lightbox.querySelector("[data-lightbox-location]");
    const lightboxCounter = lightbox.querySelector("[data-lightbox-counter]");
    const closeButton = lightbox.querySelector("[data-lightbox-close-button]");
    const previousButton = lightbox.querySelector("[data-lightbox-previous]");
    const nextButton = lightbox.querySelector("[data-lightbox-next]");
    let activeIndex = 0;
    let previouslyFocused = null;
    let pointerStartX = null;
    let imageClearTimer = null;

    const galleryItems = galleryCards.map((card) => {
      const detailLines = card
        .querySelector("figcaption small")
        .innerText.trim()
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

      const thumbnail = card.querySelector(".gallery-frame img");

      return {
        thumbnail,
        src: thumbnail.getAttribute("src"),
        number: card.querySelector("figcaption > span").textContent.trim(),
        title: card.querySelector("figcaption strong").textContent.trim(),
        meta: detailLines[0] || "",
        location: detailLines.slice(1).join(" · "),
      };
    });

    const fitStage = (naturalWidth, naturalHeight) => {
      if (!naturalWidth || !naturalHeight) {
        return false;
      }

      const ratio = naturalWidth / naturalHeight;
      const isCompact = window.matchMedia("(max-width: 680px)").matches;
      const maxWidth = window.innerWidth - (isCompact ? 0 : 128);
      const maxHeight = window.innerHeight - (isCompact ? 0 : 64);
      const width = Math.min(maxWidth, maxHeight * ratio);
      const height = width / ratio;

      lightboxStage.style.width = `${Math.round(width)}px`;
      lightboxStage.style.height = `${Math.round(height)}px`;
      return true;
    };

    const fitStageToImage = () => {
      if (
        fitStage(lightboxImage.naturalWidth, lightboxImage.naturalHeight)
      ) {
        lightbox.classList.add("image-ready");
      }
    };

    lightboxImage.addEventListener("load", fitStageToImage);
    window.addEventListener("resize", fitStageToImage, { passive: true });

    const preloadNeighbours = () => {
      [-1, 1].forEach((offset) => {
        const index =
          (activeIndex + offset + galleryItems.length) % galleryItems.length;
        const image = new Image();
        image.src = galleryItems[index].src;
      });
    };

    const displayItem = (index) => {
      activeIndex = (index + galleryItems.length) % galleryItems.length;
      const item = galleryItems[activeIndex];

      lightbox.classList.remove("image-ready");
      fitStage(item.thumbnail.naturalWidth, item.thumbnail.naturalHeight);
      lightboxImage.src = item.src;

      if (lightboxImage.complete) {
        fitStageToImage();
      }
      lightboxNumber.textContent = item.number;
      lightboxMeta.textContent = item.meta;
      lightboxTitle.textContent = item.title;
      lightboxLocation.textContent = item.location;
      lightboxLocation.hidden = !item.location;
      lightboxCounter.textContent = `${String(activeIndex + 1).padStart(
        2,
        "0",
      )} / ${String(galleryItems.length).padStart(2, "0")}`;

      preloadNeighbours();
    };

    const openLightbox = (index, trigger) => {
      previouslyFocused = trigger;
      window.clearTimeout(imageClearTimer);
      displayItem(index);
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
      lightbox.getBoundingClientRect();
      lightbox.classList.add("is-open");
      closeButton.focus();
    };

    const closeLightbox = () => {
      lightbox.classList.remove("is-open", "image-ready");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");

      imageClearTimer = window.setTimeout(() => {
        lightboxImage.removeAttribute("src");
      }, 350);

      if (previouslyFocused) {
        previouslyFocused.focus();
      }
    };

    galleryCards.forEach((card, index) => {
      const frame = card.querySelector(".gallery-frame");
      const title = galleryItems[index].title;
      frame.setAttribute("role", "button");
      frame.setAttribute("tabindex", "0");
      frame.setAttribute("aria-label", `Ouvrir ${title} en plein écran`);

      frame.addEventListener("click", () => openLightbox(index, frame));
      frame.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(index, frame);
        }
      });
    });

    closeButton.addEventListener("click", closeLightbox);
    previousButton.addEventListener("click", () =>
      displayItem(activeIndex - 1),
    );
    nextButton.addEventListener("click", () => displayItem(activeIndex + 1));

    lightbox.addEventListener("click", (event) => {
      if (
        event.target === lightbox ||
        event.target.hasAttribute("data-lightbox-backdrop")
      ) {
        closeLightbox();
      }
    });

    lightbox.addEventListener("pointerdown", (event) => {
      pointerStartX = event.clientX;
    });

    lightbox.addEventListener("pointerup", (event) => {
      if (pointerStartX === null) {
        return;
      }

      const distance = event.clientX - pointerStartX;
      pointerStartX = null;

      if (Math.abs(distance) > 60) {
        displayItem(activeIndex + (distance < 0 ? 1 : -1));
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) {
        return;
      }

      if (event.key === "Escape") {
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        displayItem(activeIndex - 1);
      } else if (event.key === "ArrowRight") {
        displayItem(activeIndex + 1);
      } else if (event.key === "Home") {
        displayItem(0);
      } else if (event.key === "End") {
        displayItem(galleryItems.length - 1);
      } else if (event.key === "Tab") {
        const controls = [closeButton, previousButton, nextButton];
        const currentIndex = controls.indexOf(document.activeElement);
        const direction = event.shiftKey ? -1 : 1;
        const nextIndex =
          (currentIndex + direction + controls.length) % controls.length;
        event.preventDefault();
        controls[nextIndex].focus();
      }
    });
  }

  document.querySelector("[data-current-year]").textContent =
    new Date().getFullYear();
})();
