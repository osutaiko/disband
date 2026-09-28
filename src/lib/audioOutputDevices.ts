export async function getAudioOutputDevices() {
  let devices = await navigator.mediaDevices.enumerateDevices();
  if (!devices.some((device) => device.kind === 'audiooutput' && device.label)) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    devices = await navigator.mediaDevices.enumerateDevices();
  }
  return devices.filter((device) => device.kind === 'audiooutput'
    && device.deviceId !== 'default' && device.deviceId !== 'communications');
}

export async function getAudioOutputDevice(name: string | undefined) {
  if (!name) return null;
  const devices = await getAudioOutputDevices();
  const device = devices.find((candidate) => candidate.label === name);
  if (!device) throw new Error(`Audio output device is unavailable: ${name}`);
  return { deviceId: device.deviceId, label: device.label, isDefault: false };
}
