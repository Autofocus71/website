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
    let currentImage = lightbox.querySelector("[data-lightbox-image]");
    let transitionImage = lightbox.querySelector(
      "[data-lightbox-transition-image]",
    );
    const lightboxStage = lightbox.querySelector(".lightbox-stage");
    const lightboxCaption = lightbox.querySelector(".lightbox-caption");
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
    let pointerId = null;
    let pointerStartX = 0;
    let dragDistance = 0;
    let isTransitioning = false;
    let imageClearTimer = null;
    let transitionToken = 0;

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

    const normaliseIndex = (index) =>
      (index + galleryItems.length) % galleryItems.length;

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

    const updateDetails = (index) => {
      const item = galleryItems[index];
      lightboxNumber.textContent = item.number;
      lightboxMeta.textContent = item.meta;
      lightboxTitle.textContent = item.title;
      lightboxLocation.textContent = item.location;
      lightboxLocation.hidden = !item.location;
      lightboxCounter.textContent = `${String(index + 1).padStart(
        2,
        "0",
      )} / ${String(galleryItems.length).padStart(2, "0")}`;
    };

    const preloadNeighbours = () => {
      [-1, 1].forEach((offset) => {
        const index = normaliseIndex(activeIndex + offset);
        const image = new Image();
        image.src = galleryItems[index].src;
      });
    };

    const revealCurrentImage = () => {
      if (fitStage(currentImage.naturalWidth, currentImage.naturalHeight)) {
        lightbox.classList.add("image-ready");
      }
    };

    const displayItem = (index) => {
      activeIndex = normaliseIndex(index);
      const item = galleryItems[activeIndex];

      lightbox.classList.remove("image-ready");
      fitStage(item.thumbnail.naturalWidth, item.thumbnail.naturalHeight);
      currentImage.src = item.src;
      currentImage.draggable = false;
      updateDetails(activeIndex);

      if (currentImage.complete && currentImage.naturalWidth) {
        revealCurrentImage();
      } else {
        currentImage.addEventListener("load", revealCurrentImage, {
          once: true,
        });
      }

      preloadNeighbours();
    };

    const resetDraggedImage = () => {
      const startTransform =
        currentImage.style.transform || "translate3d(0, 0, 0)";
      const animation = currentImage.animate(
        [
          {
            transform: startTransform,
            opacity: currentImage.style.opacity || "1",
          },
          { transform: "translate3d(0, 0, 0)", opacity: "1" },
        ],
        {
          duration: 220,
          easing: "cubic-bezier(0.2, 0.75, 0.2, 1)",
        },
      );

      animation.finished.finally(() => {
        currentImage.style.transform = "";
        currentImage.style.opacity = "";
      });
    };

    const slideTo = (index, direction, dragStart = 0) => {
      const targetIndex = normaliseIndex(index);

      if (isTransitioning || targetIndex === activeIndex) {
        resetDraggedImage();
        return;
      }

      const token = ++transitionToken;
      const item = galleryItems[targetIndex];
      isTransitioning = true;
      lightboxStage.classList.remove("is-dragging");
      transitionImage.classList.add("is-active");
      transitionImage.draggable = false;
      transitionImage.src = item.src;

      const runTransition = () => {
        if (token !== transitionToken) {
          return;
        }

        fitStage(
          transitionImage.naturalWidth,
          transitionImage.naturalHeight,
        );
        const travel = lightboxStage.getBoundingClientRect().width;
        const enteringFrom =
          (direction > 0 ? travel : -travel) + dragStart;
        const leavingTo = direction > 0 ? -travel : travel;
        const duration = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches
          ? 1
          : 380;
        const options = {
          duration,
          easing: "cubic-bezier(0.22, 0.72, 0.18, 1)",
          fill: "forwards",
        };

        transitionImage.style.visibility = "visible";
        transitionImage.style.opacity = "1";
        transitionImage.style.transform = `translate3d(${enteringFrom}px, 0, 0)`;
        currentImage.style.transform = `translate3d(${dragStart}px, 0, 0)`;

        updateDetails(targetIndex);
        lightboxCaption.animate(
          [
            {
              opacity: "0.35",
              transform: `translate3d(${direction > 0 ? 16 : -16}px, 0, 0)`,
            },
            { opacity: "1", transform: "translate3d(0, 0, 0)" },
          ],
          options,
        );

        const outgoing = currentImage.animate(
          [
            {
              transform: `translate3d(${dragStart}px, 0, 0)`,
              opacity: "1",
            },
            {
              transform: `translate3d(${leavingTo}px, 0, 0)`,
              opacity: "0.42",
            },
          ],
          options,
        );
        const incoming = transitionImage.animate(
          [
            {
              transform: `translate3d(${enteringFrom}px, 0, 0)`,
              opacity: "0.55",
            },
            { transform: "translate3d(0, 0, 0)", opacity: "1" },
          ],
          options,
        );

        Promise.all([outgoing.finished, incoming.finished])
          .then(() => {
            if (token !== transitionToken) {
              return;
            }

            const previousImage = currentImage;
            currentImage = transitionImage;
            transitionImage = previousImage;

            transitionImage.classList.remove("is-current");
            transitionImage.classList.add("is-transition");
            currentImage.classList.remove("is-transition", "is-active");
            currentImage.classList.add("is-current");

            outgoing.cancel();
            incoming.cancel();
            transitionImage.style.transform = "";
            transitionImage.style.opacity = "";
            transitionImage.style.visibility = "";
            transitionImage.removeAttribute("src");
            currentImage.style.transform = "";
            currentImage.style.opacity = "";
            currentImage.style.visibility = "";

            activeIndex = targetIndex;
            isTransitioning = false;
            preloadNeighbours();
          })
          .catch(() => {
            isTransitioning = false;
          });
      };

      if (transitionImage.complete && transitionImage.naturalWidth) {
        runTransition();
      } else {
        transitionImage.addEventListener("load", runTransition, {
          once: true,
        });
      }
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
      transitionToken += 1;
      isTransitioning = false;
      pointerId = null;
      lightbox.classList.remove("is-open", "image-ready");
      lightboxStage.classList.remove("is-dragging");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");

      [currentImage, transitionImage].forEach((image) => {
        image.getAnimations().forEach((animation) => animation.cancel());
        image.style.transform = "";
        image.style.opacity = "";
        image.style.visibility = "";
      });
      transitionImage.classList.remove("is-active");

      imageClearTimer = window.setTimeout(() => {
        currentImage.removeAttribute("src");
        transitionImage.removeAttribute("src");
      }, 350);

      if (previouslyFocused) {
        previouslyFocused.focus();
      }
    };

    const finishPointerGesture = (event, cancelled = false) => {
      if (pointerId !== event.pointerId) {
        return;
      }

      if (lightboxStage.hasPointerCapture(pointerId)) {
        lightboxStage.releasePointerCapture(pointerId);
      }

      const distance = dragDistance;
      const threshold = Math.min(
        110,
        lightboxStage.getBoundingClientRect().width * 0.12,
      );
      pointerId = null;
      dragDistance = 0;
      lightboxStage.classList.remove("is-dragging");

      if (!cancelled && Math.abs(distance) >= threshold) {
        const direction = distance < 0 ? 1 : -1;
        slideTo(activeIndex + direction, direction, distance);
      } else {
        resetDraggedImage();
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
      slideTo(activeIndex - 1, -1),
    );
    nextButton.addEventListener("click", () =>
      slideTo(activeIndex + 1, 1),
    );

    lightbox.addEventListener("click", (event) => {
      if (
        event.target === lightbox ||
        event.target.hasAttribute("data-lightbox-backdrop")
      ) {
        closeLightbox();
      }
    });

    lightboxStage.addEventListener("pointerdown", (event) => {
      if (
        isTransitioning ||
        event.button !== 0 ||
        event.target.closest(".lightbox-control")
      ) {
        return;
      }

      pointerId = event.pointerId;
      pointerStartX = event.clientX;
      dragDistance = 0;
      lightboxStage.setPointerCapture(pointerId);
      lightboxStage.classList.add("is-dragging");
    });

    lightboxStage.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) {
        return;
      }

      dragDistance = event.clientX - pointerStartX;
      const resistance = 0.88;
      const offset = dragDistance * resistance;
      const progress = Math.min(
        Math.abs(offset) / lightboxStage.getBoundingClientRect().width,
        1,
      );

      currentImage.style.transform = `translate3d(${offset}px, 0, 0)`;
      currentImage.style.opacity = String(1 - progress * 0.3);
    });

    lightboxStage.addEventListener("pointerup", (event) =>
      finishPointerGesture(event),
    );
    lightboxStage.addEventListener("pointercancel", (event) =>
      finishPointerGesture(event, true),
    );

    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) {
        return;
      }

      if (event.key === "Escape") {
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        slideTo(activeIndex - 1, -1);
      } else if (event.key === "ArrowRight") {
        slideTo(activeIndex + 1, 1);
      } else if (event.key === "Home") {
        slideTo(0, -1);
      } else if (event.key === "End") {
        slideTo(galleryItems.length - 1, 1);
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
