# tests/ui/test_smoke_login.py
import os, time
from helpers import try_selectors, fill_and_submit_login, wait_visible

def test_login_smoke(driver, base_url):
    driver.get(f"{base_url}/login")
    time.sleep(0.5)

    # Если логин другая страница — попробуем кликнуть ссылку "Войти"
    if "404" in (driver.title or "").lower() or "not found" in driver.page_source.lower():
        driver.get(base_url)

    # Если на главной есть кнопка/ссылка "Войти" — кликнем её
    try:
        login_enter = try_selectors(driver, [
            'a[href*="login"]', 'a[href*="signin"]', 'a:has-text("Войти")',
            'button:has-text("Войти")'
        ], timeout=2)
        login_enter.click()
        time.sleep(0.3)
    except Exception:
        pass  # возможно, уже на логин-странице

    # Логинимся
    fill_and_submit_login(
        driver,
        os.getenv("TEST_USER", "admin"),
        os.getenv("TEST_PASS", "123")
    )

    # Проверяем, что попали внутрь (подставь свой селектор/текст хедера)
    header = wait_visible(driver, "header .app-title, .app-title, [data-testid='app-title']", timeout=10)
    assert "Archtool" in header.text or header.text.strip() != ""
