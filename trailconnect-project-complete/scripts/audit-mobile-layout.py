import json
from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:3000"
VIEWPORTS = (320, 375, 390)


def inspect_overflow(page):
    return page.evaluate(
        """
        () => {
          const viewportWidth = window.innerWidth;
          const isInsideHorizontalRail = (element) => {
            let parent = element.parentElement;
            while (parent) {
              const parentStyle = getComputedStyle(parent);
              if ((parentStyle.overflowX === 'auto' || parentStyle.overflowX === 'scroll') && parent.scrollWidth > parent.clientWidth) return true;
              parent = parent.parentElement;
            }
            return false;
          };
          const offenders = [...document.querySelectorAll('body *')]
            .map((element) => {
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return {
                element,
                tag: element.tagName.toLowerCase(),
                className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                overflowX: style.overflowX,
              };
            })
            .filter((item) => item.width > 0 && (item.left < -1 || item.right > viewportWidth + 1))
            .filter((item) => !isInsideHorizontalRail(item.element))
            .map(({ element, ...item }) => item)
            .slice(0, 10);
          return {
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth,
            offenders,
          };
        }
        """
    )


def activate(page, screen):
    if screen == "Explorer":
        page.get_by_text("Carte", exact=True).last.click()
    elif screen == "Création":
        page.get_by_text("Créer", exact=True).last.click()
    elif screen == "Communauté":
        page.get_by_text("Groupes", exact=True).last.click()
    elif screen == "Fiche sortie":
        page.get_by_text("Boucle des lacs de Mont-Tremblant", exact=True).click()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium")
    results = []
    for width in VIEWPORTS:
        for screen in ("Accueil", "Explorer", "Création", "Communauté", "Fiche sortie"):
            page = browser.new_page(viewport={"width": width, "height": 844})
            page.goto(BASE_URL, wait_until="networkidle")
            activate(page, screen)
            page.wait_for_timeout(150)
            results.append({"viewport": width, "screen": screen, **inspect_overflow(page)})
            page.close()
    browser.close()
    print(json.dumps(results, ensure_ascii=False, indent=2))
