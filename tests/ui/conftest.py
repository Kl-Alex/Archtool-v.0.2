import os, pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE_URL = os.getenv("BASE_URL", "http://localhost:5173")  # Vite dev по умолчанию
REMOTE_URL = os.getenv("SELENIUM_REMOTE_URL")  # если задано — подключаемся к удалённому хабу

@pytest.fixture(scope="session")
def base_url():
    return BASE_URL.rstrip("/")

@pytest.fixture
def driver():
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    if REMOTE_URL:
        wd = webdriver.Remote(command_executor=REMOTE_URL, options=opts)
    else:
        wd = webdriver.Chrome(options=opts)
    try:
        yield wd
    finally:
        wd.quit()

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    if rep.when == "call" and rep.failed:
        driver = item.funcargs.get("driver")
        if driver:
            os.makedirs("artifacts", exist_ok=True)
            ts = int(time.time())
            driver.save_screenshot(f"artifacts/fail_{ts}.png")
            with open(f"artifacts/fail_{ts}.html", "w", encoding="utf-8") as f:
                f.write(driver.page_source)
            if "BASE_URL" in os.environ:
                with open(f"artifacts/context_{ts}.txt", "w", encoding="utf-8") as f:
                    f.write(f"URL: {driver.current_url}\nTITLE: {driver.title}\n")