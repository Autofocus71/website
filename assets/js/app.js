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

  document.querySelector("[data-current-year]").textContent =
    new Date().getFullYear();
})();
