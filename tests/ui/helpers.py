# tests/ui/helpers.py
import os, time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def wait_visible(driver, selector, timeout=10):
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, selector))
    )

def try_selectors(driver, selectors, timeout=10):
    last_err = None
    for sel in selectors:
        try:
            return wait_visible(driver, sel, timeout=timeout)
        except Exception as e:
            last_err = e
    # отладочные дампы
    ts = int(time.time())
    os.makedirs("artifacts", exist_ok=True)
    driver.save_screenshot(f"artifacts/fail_{ts}.png")
    with open(f"artifacts/fail_{ts}.html", "w", encoding="utf-8") as f:
        f.write(driver.page_source)
    raise last_err

def fill_and_submit_login(driver, username, password):
    user = try_selectors(driver, [
        '[data-testid="login-username"]',
        'input[name="username"]',
        'input[name="login"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[type="text"]'
    ])
    pwd = try_selectors(driver, [
        '[data-testid="login-password"]',
        'input[name="password"]',
        'input[type="password"]'
    ])
    btn = try_selectors(driver, [
        '[data-testid="login-submit"]',
        'button[type="submit"]',
        'button:has-text("Войти")',  # сработает в Chrome только если есть CSS :has
        'button'
    ])
    user.clear(); user.send_keys(username)
    pwd.clear(); pwd.send_keys(password)
    btn.click()
