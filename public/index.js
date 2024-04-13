class PeerService {
    constructor() {
        if (!this.peer) {
            this.peer = new RTCPeerConnection({
                iceServers: [
                    {
                        urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478']
                    }
                ]
            })
        }
    }

    async getAnswer(offer) {
        if (this.peer) {
            await this.peer.setRemoteDescription(offer)
            const ans = await this.peer.createAnswer()
            await this.peer.setLocalDescription(ans);
            return ans;
        }
    }

    async setRemoteDescription(ans) {
        if (this.peer) {
            await this.peer.setRemoteDescription(ans);
        }
    }

    async getOffer() {
        if (this.peer) {
            const offer = await this.peer.createOffer();
            await this.peer.setLocalDescription(offer)
            return offer;
        }
    }
}

  
let localStream;
let remoteStream; 

let remotesocketID 
let offer;
let peer = new PeerService()
 
const socket = io("http://localhost:5000");

socket.on('disconnected', async ({ data }) => {
    console.log("Disconnected!")
    var container = document.getElementById('user-2');
    container.classList.add('hidden');
})


peer.peer.onicecandidateerror = (event) => {
    console.error("ICE candidate error:", event.errorCode, event.errorText);
};

peer.peer.onicecandidate = async (event) => {
    if (event.candidate) {
        console.log("EVENT Candidate", event.candidate)
        socket.emit('icecandidate', { candidate: event.candidate, to: remotesocketID })
    } else {
        console.log("ICE candidate gathering complete.");
    }
};

socket.on('icecandidate', async ({ from, candidate }) => {
    console.log("Receieved iceicecandidate from other")
    peer.peer.addIceCandidate(candidate)
})

socket.on('peer:nego:final', async ({ ans, from }) => {
    console.log("peer:nego:final")
    await peer.setRemoteDescription(ans);
})

socket.on('peer:nego:needed', async ({ offer, from }) => {
    const ans = await peer.getAnswer(offer);
    socket.emit('peer:nego:done', { ans, to: from })
})

peer.peer.addEventListener('negotiationneeded', async () => {
    console.log("negotiationneeded")
    let offer = await peer.getOffer();
    socket.emit('peer:nego:needed', { offer, to: remotesocketID })
})

// socket.on('call:accepted', async ({ from, ans }) => {
//     await peer.setLocalDescription(ans);
//     console.log("Call Accepted!", ans)
// })

socket.on('user:call', async ({ from, offer }) => {
    console.log("I'm called! ", offer)
    let ans = await peer.getAnswer(offer)
    socket.emit('call:accepted', { ans, to: from })
    remotesocketID = from;
})

socket.on('user:joined', ({ from }) => {
    console.log("A user Joined from: ", offer)
    var container = document.getElementById('user-2');
    container.classList.remove('hidden');
    socket.emit('user:call', { offer, to: from })
    remotesocketID = from
})


let init = async () => {

    offer = await peer.getOffer();

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    remoteStream = new MediaStream()
    document.getElementById('user-1').srcObject = localStream
    document.getElementById('user-2').srcObject = remoteStream


    localStream.getTracks().forEach((track) => {
        peer.peer.addTrack(track, localStream);
        console.log("localStream")
    });

    peer.peer.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        });
        console.log("event.streams[0].getTracks()")
    };
}

 
socket.on('On:room:join', (id) => {
    var container = document.getElementById('showvideo');
    container.classList.remove('hidden');
    init()
});

const form = document.getElementById('myForm');
form.addEventListener('submit', function (event) {
    event.preventDefault();
    const roomId = document.getElementById('roomId').value;
    socket.emit('room:join', { roomId });
    console.log(roomId)
});

let toggleCamera = async () => {
    let videoTrack = localStream.getTracks().find(track => track.kind === 'video')

    if (videoTrack.enabled) {
        videoTrack.enabled = false
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)'
    } else {
        videoTrack.enabled = true
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
    }
}

let toggleMic = async () => {
    let audioTrack = localStream.getTracks().find(track => track.kind === 'audio')

    if (audioTrack.enabled) {
        audioTrack.enabled = false
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)'
    } else {
        audioTrack.enabled = true
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
    }
}

document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)



