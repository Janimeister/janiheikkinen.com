import { test, expect } from './api-mocks';
import { ANSWER, cacheNames, finishDownload, mockChatModel } from './chat-model';
import { expectBackLink } from './helpers';

test.describe('Chat Page', () => {
  test('has heading, back link and attribution', async ({ page }) => {
    await mockChatModel(page);
    await page.goto('/chat');

    await expect(page.locator('h1')).toContainText('Local AI Chat');
    await expectBackLink(page);
    await expect(page.locator('main a[href="https://ai.google.dev/gemma/terms"]')).toBeVisible();
  });

  test('downloads nothing until asked', async ({ page }) => {
    await mockChatModel(page);
    await page.goto('/chat');

    await expect(page.getByTestId('chat-load')).toHaveText('Download model (344 MB)');
    await expect(page.getByTestId('chat-delete')).toHaveCount(0);
    await expect(page.getByTestId('chat-input')).toBeDisabled();
    await expect(page.getByText('Start the model to chat with it.')).toBeVisible();
    expect(await cacheNames(page)).toEqual([]);
  });

  test('says so when the browser cannot run the model', async ({ page }) => {
    // No stand-in: these browsers have no GPU to offer.
    await page.goto('/chat');

    await expect(page.getByTestId('chat-model-status')).toContainText(
      "This browser can't run the model",
    );
    await expect(page.getByTestId('chat-load')).toHaveCount(0);
    await expect(page.getByTestId('chat-input')).toBeDisabled();
  });

  test('shows the download and then chats', async ({ page }) => {
    await mockChatModel(page, { holdDownload: true });
    await page.goto('/chat');

    await page.getByTestId('chat-load').click();
    await expect(page.getByTestId('chat-model-status')).toContainText(
      'Downloading the model… 86 of 344 MB',
    );
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    // Screen readers get the figures from the bar; the changing text is hidden from them.
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '86 of 344 MB');
    await expect(page.getByRole('progressbar')).toHaveAccessibleName('Downloading the model…');
    await expect(page.getByTestId('chat-input')).toBeDisabled();

    await finishDownload(page);
    await expect(page.getByTestId('chat-model-status')).toContainText(
      'The model is running and takes 344 MB on this device.',
    );

    await page.getByTestId('chat-input').fill('What is the capital of France?');
    await page.getByTestId('chat-input').press('Enter');

    const messages = page.getByTestId('chat-messages').locator('li');
    await expect(messages).toHaveCount(2);
    await expect(messages.nth(0)).toContainText('What is the capital of France?');
    await expect(messages.nth(1)).toContainText(ANSWER);
    await expect(page.getByTestId('chat-input')).toHaveValue('');

    await page.getByTestId('chat-clear').click();
    await expect(page.getByTestId('chat-messages')).toHaveCount(0);
  });

  test('Shift+Enter starts a new line instead of sending', async ({ page }) => {
    await mockChatModel(page);
    await page.goto('/chat');
    await page.getByTestId('chat-load').click();

    const input = page.getByTestId('chat-input');
    await expect(input).toBeEnabled();
    await input.fill('One');
    await input.press('Shift+Enter');
    await input.pressSequentially('Two');

    await expect(input).toHaveValue('One\nTwo');
    await expect(page.getByTestId('chat-messages')).toHaveCount(0);
  });

  test('cancels a download', async ({ page }) => {
    await mockChatModel(page, { holdDownload: true });
    await page.goto('/chat');
    await page.getByTestId('chat-load').click();

    await page.getByTestId('chat-cancel').click();

    await expect(page.getByTestId('chat-load')).toHaveText('Download model (344 MB)');
    await expect(page.getByTestId('chat-input')).toBeDisabled();
    expect(await cacheNames(page)).toEqual([]);
  });

  test('stops an answer and keeps what was written', async ({ page }) => {
    await mockChatModel(page, { holdAnswer: true });
    await page.goto('/chat');
    await page.getByTestId('chat-load').click();
    await page.getByTestId('chat-input').fill('Hello');
    await page.getByTestId('chat-send').click();

    await expect(page.getByTestId('chat-messages').locator('li').nth(1)).toContainText('The');
    await expect(page.getByTestId('chat-clear')).toBeDisabled();
    await page.getByTestId('chat-stop').click();

    await expect(page.getByTestId('chat-send')).toBeVisible();
    await expect(page.getByTestId('chat-messages').locator('li').nth(1)).toHaveText(/The$/);
  });

  test('goes on after an answer that ended before its first word', async ({ page }) => {
    await mockChatModel(page, { emptyAnswer: true });
    await page.goto('/chat');
    await page.getByTestId('chat-load').click();
    const messages = page.getByTestId('chat-messages').locator('li');

    await page.getByTestId('chat-input').fill('Hello');
    await page.getByTestId('chat-input').press('Enter');
    await expect(page.getByTestId('chat-send')).toBeVisible();
    await expect(messages).toHaveCount(1);

    // The unanswered question stays on the page, but the model is asked only the new one.
    await page.getByTestId('chat-input').fill('Are you there?');
    await page.getByTestId('chat-input').press('Enter');
    await expect(messages).toHaveCount(3);
    await expect(messages.nth(2)).toContainText(ANSWER);
    await expect(page.locator('p.text-red-400')).toHaveCount(0);
  });

  test('a model that breaks down mid-answer can be started again', async ({ page }) => {
    await mockChatModel(page, { failAnswer: true });
    await page.goto('/chat');
    await page.getByTestId('chat-load').click();
    await page.getByTestId('chat-input').fill('Hello');
    await page.getByTestId('chat-send').click();

    await expect(page.locator('p.text-red-400')).toContainText(
      'The model stopped before it finished its answer.',
    );
    await expect(page.getByTestId('chat-input')).toBeDisabled();
    const messages = page.getByTestId('chat-messages').locator('li');
    await expect(messages.nth(1)).toHaveText(/The$/);

    await expect(page.getByTestId('chat-load')).toHaveText('Start the model');
    await page.getByTestId('chat-load').click();
    await expect(page.locator('p.text-red-400')).toHaveCount(0);
    await page.getByTestId('chat-input').fill('Again');
    await page.getByTestId('chat-send').click();
    await expect(messages.nth(3)).toContainText(ANSWER);
  });

  test('follows the conversation to its end as it grows', async ({ page }) => {
    await mockChatModel(page);
    await page.goto('/chat');
    await page.getByTestId('chat-load').click();
    const log = page.getByTestId('chat-messages');

    for (const question of ['One', 'Two', 'Three', 'Four', 'Five', 'Six']) {
      await page.getByTestId('chat-input').fill(question);
      await page.getByTestId('chat-input').press('Enter');
      await expect(log.locator('li').last()).toContainText(ANSWER);
    }

    // Taller than its box by now, and scrolled all the way down.
    const gap = await log.evaluate((element) => {
      const { scrollHeight, scrollTop, clientHeight } = element;
      return {
        overflow: scrollHeight - clientHeight,
        fromEnd: scrollHeight - scrollTop - clientHeight,
      };
    });
    expect(gap.overflow).toBeGreaterThan(0);
    expect(gap.fromEnd).toBeLessThanOrEqual(1);
  });

  test('offers a stored model on a later visit and deletes it on request', async ({ page }) => {
    await mockChatModel(page, { stored: true });
    await page.goto('/chat');

    await expect(page.getByTestId('chat-model-status')).toContainText(
      'The model is on this device and takes 344 MB.',
    );
    await expect(page.getByTestId('chat-load')).toHaveText('Start the model');
    await expect(page.getByTestId('chat-input')).toBeDisabled();

    await page.getByTestId('chat-delete').click();

    await expect(page.getByTestId('chat-model-status')).toContainText(
      'The model has been deleted from this device.',
    );
    await expect(page.getByTestId('chat-load')).toHaveText('Download model (344 MB)');
    await expect(page.getByTestId('chat-delete')).toHaveCount(0);
    expect(await cacheNames(page)).toEqual([]);
  });

  test('deleting a running model ends the chat', async ({ page }) => {
    await mockChatModel(page);
    await page.goto('/chat');
    await page.getByTestId('chat-load').click();
    await expect(page.getByTestId('chat-input')).toBeEnabled();
    expect(await cacheNames(page)).toEqual(['transformers-cache']);

    await page.getByTestId('chat-delete').click();

    await expect(page.getByTestId('chat-input')).toBeDisabled();
    await expect(page.getByTestId('chat-load')).toHaveText('Download model (344 MB)');
    expect(await cacheNames(page)).toEqual([]);
  });

  test('explains a model that fails to start', async ({ page }) => {
    await mockChatModel(page, { failLoad: true });
    await page.goto('/chat');

    await page.getByTestId('chat-load').click();

    await expect(page.locator('p.text-red-400')).toContainText('The model could not be started.');
    await expect(page.getByTestId('chat-load')).toBeVisible();
  });

  test('speaks Finnish under /fi', async ({ page }) => {
    await mockChatModel(page);
    await page.goto('/fi/chat');

    await expect(page.locator('h1')).toHaveText('Paikallinen tekoälychat');
    await expect(page.getByTestId('chat-load')).toHaveText('Lataa malli (344 Mt)');
  });
});
