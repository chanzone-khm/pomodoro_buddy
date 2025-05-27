// バックグラウンドからの音声再生要求を受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === "playSound") {
		playSound(message.sessionType);
		sendResponse({ success: true });
	}
});

function playSound(sessionType) {
	try {
		// まずファイル音声を試す
		const soundFile =
			sessionType === "work"
				? "sounds/work-complete.wav"
				: "sounds/break-complete.wav";

		const audio = new Audio(chrome.runtime.getURL(soundFile));
		audio.volume = 0.5;

		audio.play().catch(() => {
			// ファイル音声が失敗した場合はビープ音にフォールバック
			console.log("ファイル音声再生失敗、ビープ音にフォールバック");
			playBeepSound(sessionType);
		});
	} catch (error) {
		console.error("音声再生エラー:", error);
		// エラーの場合もビープ音にフォールバック
		playBeepSound(sessionType);
	}
}

function playBeepSound(sessionType) {
	try {
		const audioContext = new (window.AudioContext ||
			window.webkitAudioContext)();

		if (sessionType === "work") {
			// 作業完了音：高めの音、2回
			createBeep(audioContext, 800, 0.2, 0);
			createBeep(audioContext, 800, 0.2, 0.3);
		} else {
			// 休憩完了音：低めの音、3回
			createBeep(audioContext, 400, 0.3, 0);
			createBeep(audioContext, 400, 0.3, 0.4);
			createBeep(audioContext, 400, 0.3, 0.8);
		}
	} catch (error) {
		console.error("ビープ音の再生に失敗しました:", error);
	}
}

function createBeep(audioContext, frequency, duration, delay) {
	const oscillator = audioContext.createOscillator();
	const gainNode = audioContext.createGain();

	oscillator.connect(gainNode);
	gainNode.connect(audioContext.destination);

	oscillator.frequency.value = frequency;
	oscillator.type = "sine";

	const startTime = audioContext.currentTime + delay;
	gainNode.gain.setValueAtTime(0.3, startTime);
	gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

	oscillator.start(startTime);
	oscillator.stop(startTime + duration);
}
