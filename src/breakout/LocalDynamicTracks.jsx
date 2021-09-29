import React, { Component } from "react";
import _ from "lodash";
import { componentGetCompareProps } from "./Shared";
import "./libjitsi.css";
import { isFirefox } from "react-device-detect";
import Mute from "../images/mute.png";
import PushBtn from "../images/push-btn.png";
import ScreenShare from "../images/screen-share.svg";

export class LocalDynamicTracks extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedMicDeviceId: "none",
      selectedVideoDeviceId: "none",
      selectedSpeakerDeviceId: "none",
      loaded: false,
      isMicOn: true,
      pushDown: false,
      showOverlay: false,
      overlayTimeout: 30000,
    };
    this.videoRef = React.createRef();
    this.micRef = React.createRef();
    this.trackList = [];
  }

  componentDidMount() {
    const {
      deviceList = [],
      defaultMicId,
      defaultVideoId,
      defaultSpeakerId,
      activeRoomId,
      name,
    } = this.props;

    setTimeout(
      () => this.setState({ showOverlay: true }),
      this.state.overlayTimeout
    );

    const spaceClick = (e) => {
      if (e.code === "Space" && this.props.muteSource !== true) {
        this.unmuteMic();
      } else if (e.code === "KeyS" && this.props.muteSource !== true) {
        this.unmuteMic();
        this.props.muteSpeaker();
      } else if (e.code === "KeyM") {
        this.unmuteMic();
        // this.props.muteSpeaker();
        this.muteSource();
        // this.userInactive();
      } else {
        return;
      }
    };

    const spaceClickUp = (e) => {
      if (e.code === "Space") {
        this.muteMic();
      } else if (e.code === "KeyS") {
        this.muteMic();
        this.props.unmuteSpeaker();
      } else if (e.code === "KeyM") {
        this.muteMic();
        // this.props.unmuteSpeaker();
        this.unmuteSource();
        // this.userInactive();
      }
    };

    window.addEventListener("keydown", spaceClick);
    window.addEventListener("keyup", spaceClickUp);

    const constraints = !isFirefox
      ? {
          video: {
            aspectRatio: 16 / 9,
            width: 1920,
            height: 1080,
          },
        }
      : null;

    let localTracksConfig = {
      devices: ["audio", "video"],
      constraints: constraints,
    };
    if (defaultVideoId !== "none") {
      localTracksConfig.cameraDeviceId = defaultVideoId;
    }
    window.JitsiMeetJS.createLocalTracks(localTracksConfig).then((tracks) => {
      console.log(tracks, "papatracks");
      if (defaultMicId == "none" || defaultVideoId == "none") {
        window.JitsiMeetJS.mediaDevices.enumerateDevices((devices) => {
          let newDeviceList = [];
          for (let device of devices) {
            newDeviceList.push({
              name: device.label,
              id: device.deviceId,
              type: device.kind,
            });
          }
          let micId =
            (_.find(newDeviceList, { type: "audioinput" }) || {}).id || "none";
          let videoId =
            (_.find(newDeviceList, { type: "videoinput" }) || {}).id || "none";
          let speakerId =
            (_.find(newDeviceList, { type: "audiooutput" }) || {}).id || "none";

          let deviceIds = _.map(newDeviceList, (nd) => nd.id);
          for (let track of tracks) {
            if (_.indexOf(deviceIds, track.deviceId) !== -1) {
              this.trackList.push(track);
            }
          }
          this.setState(
            {
              loaded: true,
              deviceList: newDeviceList,
              selectedMicDeviceId: micId,
              selectedVideoDeviceId: videoId,
              selectedSpeakerDeviceId: speakerId,
            },
            () => {
              this.updateLocalTrack(micId, "set");
              this.updateLocalTrack(videoId, "set");
              this.updateLocalTrack(speakerId, "set");
              this.onJoin();
            }
          );
        });
      } else {
        let deviceIds = _.map(deviceList, (nd) => nd.id);
        for (let track of tracks) {
          if (_.indexOf(deviceIds, track.deviceId) !== -1) {
            this.trackList.push(track);
          }
        }

        this.setState(
          {
            loaded: true,
            deviceList: deviceList,
            selectedMicDeviceId: defaultMicId,
            selectedVideoDeviceId: defaultVideoId,
            selectedSpeakerDeviceId: defaultSpeakerId,
          },
          () => {
            this.updateLocalTrack(defaultMicId, "set");
            this.updateLocalTrack(defaultVideoId, "set");
            this.updateLocalTrack(defaultSpeakerId, "set");
            this.onJoin();
          }
        );
      }
    });
  }

  updateLocalTrack = (deviceId, action = "clear", isPopUp = false) => {
    if (action === "clear") {
      let clearTrack = _.find(this.trackList, { deviceId: deviceId });
      if (clearTrack) {
        // eslint-disable-next-line default-case
        switch (clearTrack.getType()) {
          case "audio":
            if (this.micRef.current) {
              clearTrack.detach(this.micRef.current);
              clearTrack.dispose();
            }
            break;
          case "video":
            if (this.videoRef.current) {
              clearTrack.detach(this.videoRef.current);
              clearTrack.dispose();
            }
            break;
        }
      }
    } else if (action === "set") {
      let setTrack = _.find(this.trackList, (t) => {
        return t.deviceId === deviceId;
      });
      if (setTrack) {
        setTrack.is;
        // eslint-disable-next-line default-case
        switch (setTrack.getType()) {
          case "audio":
            if (this.micRef.current) {
              setTrack.attach(this.micRef.current);
            }
            break;
          case "video":
            if (setTrack && this.videoRef.current) {
              if (isPopUp) {
                setTrack.attach(this.videoPopUpRef.current);
              }
              setTrack.attach(this.videoRef.current);
            }
            break;
        }
      }
    }
  };

  componentDidUpdate(prevProps, prevState) {
    const selectedVideoDeviceId = componentGetCompareProps(
      "selectedVideoDeviceId",
      this.state,
      prevState,
      ""
    );

    // if (prevProps.muteSource !== this.props.muteSource) {
    //   if (this.props.muteSource === true) {
    //     const { selectedMicDeviceId } = this.state;
    //     let track = _.find(this.trackList, (t) => {
    //       return t.deviceId === selectedMicDeviceId;
    //     });
    //     track?.mute();
    //     console.log("papamuted");
    //   } else if (this.props.muteSource === false) {
    //     const { selectedMicDeviceId } = this.state;
    //     let track = _.find(this.trackList, (t) => {
    //       return t.deviceId === selectedMicDeviceId;
    //     });
    //     track?.unmute();
    //     console.log("papaunmuted");
    //   } else console.log("papanull");
    // }

    if (selectedVideoDeviceId.HasChanged) {
      if (selectedVideoDeviceId.Previous !== "") {
        this.updateLocalTrack(selectedVideoDeviceId.Previous, "clear");
      }
      if (selectedVideoDeviceId.Current !== "") {
        this.updateLocalTrack(selectedVideoDeviceId.Current, "set");
      }
    }

    const selectedMicDeviceId = componentGetCompareProps(
      "selectedMicDeviceId",
      this.state,
      prevState,
      ""
    );

    if (selectedMicDeviceId.HasChanged) {
      if (selectedMicDeviceId.Previous !== "") {
        this.updateLocalTrack(selectedMicDeviceId.Previous, "clear");
      }
      if (selectedMicDeviceId.Current !== "") {
        this.updateLocalTrack(selectedMicDeviceId.Current, "set");
      }
    }

    const activeRoomId = componentGetCompareProps(
      "activeRoomId",
      this.props,
      prevProps,
      ""
    );

    if (activeRoomId.HasChanged) {
      if (activeRoomId.Current && window.libjisti.activeRoom) {
        const { selectedMicDeviceId, selectedVideoDeviceId } = this.state;
        let videoTrack = _.find(this.trackList, (t) => {
          return t.deviceId === selectedVideoDeviceId;
        });
        let micTrack = _.find(this.trackList, (t) => {
          return t.deviceId === selectedMicDeviceId;
        });
        if (videoTrack) {
          window.libjisti.activeRoom.addTrack(videoTrack);
        }
        if (micTrack) {
          window.libjisti.activeRoom.addTrack(micTrack);
        }
      }
    }
  }

  componentWillUnmount() {
    const { selectedMicDeviceId, selectedVideoDeviceId } = this.state;

    this.updateLocalTrack(selectedMicDeviceId, "clear");
    this.updateLocalTrack(selectedVideoDeviceId, "clear");
  }

  onCameraChange = (event) => {
    this.setState({ selectedVideoDeviceId: event.target.value }, () =>
      this.updateLocalTrack(this.state.selectedVideoDeviceId, "clear")
    );
  };

  muteMic = () => {
    const { selectedMicDeviceId, isMicOn } = this.state;
    this.setState({ pushDown: false, isMicOn: !isMicOn }, () => {
      let track = _.find(this.trackList, (t) => {
        return t.deviceId === selectedMicDeviceId;
      });
      track?.mute();
      this.userInactive();
      window?.libjisti?.activeRoom?.setLocalParticipantProperty(
        "pushDown",
        "false"
      );
    });
  };

  unmuteMic = () => {
    const { selectedMicDeviceId, isMicOn } = this.state;
    this.setState({ pushDown: true, isMicOn: !isMicOn }, () => {
      let track = _.find(this.trackList, (t) => {
        return t.deviceId === selectedMicDeviceId;
      });
      track?.unmute();
      this.userInactive();
      window?.libjisti?.activeRoom?.setLocalParticipantProperty(
        "pushDown",
        "true"
      );
    });
  };

  userInactive = () => {
    this.setState({ showOverlay: false, overlayTimeout: 30000 }, () => {
      if (!this.state.pushDown) {
        setTimeout(
          () => this.setState({ showOverlay: true }),
          this.state.overlayTimeout
        );
      }
    });
  };

  //screen share function

  // shareScreen = () => {
  //   let videoTrack = _.find(this.trackList, { videoType: "camera" });
  //   console.log(videoTrack, this.trackList, 321);
  //   videoTrack.dispose();
  //   console.log(videoTrack, 323);
  //   this.trackList.pop();
  //   window.JitsiMeetJS.createLocalTracks({
  //     devices: ["desktop"],
  //     constraints: {
  //       video: {
  //         aspectRatio: 16 / 9,
  //         height: {
  //           ideal: 180,
  //           max: 180,
  //           min: 180,
  //         },
  //       },
  //     },
  //   })
  //     .then((tracks) => {
  //       let desktopTrack = _.find(tracks, { videoType: "desktop" });
  //       this.trackList.push(desktopTrack);
  //       desktopTrack.addEventListener(
  //         JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
  //         () => console.log("local track muted")
  //       );
  //       desktopTrack.addEventListener(
  //         JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
  //         () => {
  //           let desktopTrack = _.find(tracks, { videoType: "desktop" });
  //           desktopTrack.dispose();
  //           window.JitsiMeetJS.createLocalTracks({
  //             devices: ["video"],
  //             constraints: {
  //               video: {
  //                 aspectRatio: 16 / 9,
  //                 height: {
  //                   ideal: 180,
  //                   max: 180,
  //                   min: 180,
  //                 },
  //               },
  //             },
  //           })
  //             .then((tracks) => {
  //               let videoTrack = _.find(tracks, { videoType: "camera" });
  //               this.trackList.push(videoTrack);
  //               videoTrack.addEventListener(
  //                 JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
  //                 () => console.log("local track muted")
  //               );
  //               videoTrack.addEventListener(
  //                 JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
  //                 () => console.log("local track stoped")
  //               );
  //               videoTrack.attach(this.videoRef.current);
  //               window.libjisti.activeRoom.addTrack(videoTrack);
  //             })
  //             .catch((error) => console.log(error));
  //         }
  //       );
  //       desktopTrack.attach(this.videoRef.current);
  //       window.libjisti.activeRoom.addTrack(desktopTrack);
  //     })
  //     .catch((error) => {
  //       if (error.name == "gum.screensharing_user_canceled") {
  //         window.JitsiMeetJS.createLocalTracks({
  //           devices: ["video"],
  //           constraints: {
  //             video: {
  //               aspectRatio: 16 / 9,
  //               height: {
  //                 ideal: 180,
  //                 max: 180,
  //                 min: 180,
  //               },
  //             },
  //           },
  //         })
  //           .then((tracks) => {
  //             let videoTrack = _.find(tracks, { videoType: "camera" });
  //             this.trackList.push(videoTrack);
  //             videoTrack.addEventListener(
  //               JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
  //               () => console.log("local track muted")
  //             );
  //             videoTrack.addEventListener(
  //               JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
  //               () => console.log("local track stoped")
  //             );
  //             videoTrack.attach(this.videoRef.current);
  //             window.libjisti.activeRoom.addTrack(videoTrack);
  //           })
  //           .catch((error) => console.log(error));
  //       } else {
  //         throw error?.message;
  //       }
  //     });
  // };

  // muteUser = (participantId) => {
  //   let tracks = _.filter(window.libjisti.remoteTracks, {
  //     participantId: participantId,
  //   });
  //   let participantAudioTrack = _.find(tracks, { type: "audio" });
  //   participantAudioTrack.track.detach($(`#${participantId} audio`)[0]);
  //   console.log(
  //     "papaclick",
  //     $(`#${participantId} audio`),
  //     participantAudioTrack,
  //     participantId
  //   );
  // };

  // muteAll = () => {
  //   // const tracks = _.filter(window.libjisti.remoteTracks, { type: "audio" });
  //   // tracks.map((el, index) =>
  //   //   el.track.detach($(`#${el.participantId} audio`)[index])
  //   // );

  //   // tracks.map((singleTrack) => {
  //   //   return singleTrack
  //   //   // singleTrack.track.detach($(`#${singleTrack.participantId} audio`)[0]);
  //   // });
  //   // console.log($("audio"), "papamuteall");
  //   //try to do it in page.jsx or remotetrack.jsx

  //   const participantIds = _.map(window.libjisti.remoteTracks, "participantId");
  //   participantIds.map((participantId) => {
  //     this.muteUser(participantId);
  //   });
  // };

  // unmuteAll = () => {
  //   console.log(window.libjisti.remoteTracks, "papaunmuteall");
  // };

  muteSource = () => {
    this.setState({ pushDown: true }, () => {
      window?.libjisti?.activeRoom?.setLocalParticipantProperty(
        "muteSource",
        "true"
      );
    });
  };

  unmuteSource = () => {
    this.setState({ pushDown: false }, () => {
      window?.libjisti?.activeRoom?.setLocalParticipantProperty(
        "muteSource",
        "false"
      );
    });
  };

  onJoin = () => {
    this.props.onConnect();
    let track = _.find(this.trackList, (t) => {
      return t.deviceId === this.state.selectedMicDeviceId;
    });
    track?.mute();
  };

  render() {
    const { selectedVideoDeviceId, deviceList = [] } = this.state;

    // if (this.props.muteSource === true) {
    //   let track = _.find(this.trackList, (t) => {
    //     return t.deviceId === this.state.selectedMicDeviceId;
    //   });
    //   track?.mute();
    // } else if (this.props.muteSource === false) {
    //   let track = _.find(this.trackList, (t) => {
    //     return t.deviceId === this.state.selectedMicDeviceId;
    //   });
    //   track?.unmute();
    // }
    return (
      <>
        <div
          className={`${this.props.name} fullsize position-relative`}
          style={{
            // width: this.props.localWidth + `%`,
            height: "44vh",
            padding: "10px",
            // width: "50%",
            // display: this.props.status === "closed" ? "none" : "inline-block",
          }}
        >
          <div
            onMouseDown={this.unmuteMic}
            onMouseUp={this.muteMic}
            className="position-relative overflow-hidden"
            style={{ height: "100%", margin: "auto", aspectRatio: "16 / 9" }}
          >
            <video
              className="local-video d-flex"
              autoPlay="1"
              ref={this.videoRef}
              style={{
                height: "100%",
                width: "100%",
                objectFit: "cover",
                borderRadius: "20px",
              }}
            />
            <audio autoPlay="1" muted={true} ref={this.micRef} />

            <div
              className="video_overlay d-flex justify-content-center align-items-center"
              style={{
                width: "100%",
                height: "100%",
                transition: ".5s all",
                background: "rgba(235, 121, 0, 0.6)",
                position: "absolute",
                top: this.state.showOverlay ? 0 : "100%",
                left: 0,
                border: "2px solid #ACACAC",
                borderRadius: "20px",
              }}
            >
              <img style={{ width: "75%" }} src={PushBtn} alt="push button" />
              {/* <div className="push-container">
                <div className="push-line"></div>
                <div className="push-button">
                  PUSH <span style={{ color: "black" }}>BUTTON</span> TO <br />
                  ACTIVATE
                </div>
              </div> */}
            </div>
            <div
              style={{
                color: "white",
                fontSize: "1.2em",
                fontWeight: "semibold",
                top: "5px",
                left: "15px",
              }}
              className="origin position-absolute"
            >
              <div
                className={`${this.state.showOverlay && "nameinactive"} name`}
              >
                {this.props.name}
              </div>
              {/* <div>
                <select
                  value={selectedVideoDeviceId}
                  onChange={this.onCameraChange}
                  className="nav-item"
                >
                  {_.map(
                    _.filter(deviceList, { type: "videoinput" }),
                    (d, index) => {
                      return (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      );
                    }
                  )}
                </select>
              </div> */}
            </div>

            {/* screen share icon */}

            {/* <div
              style={{
                position: "absolute",
                bottom: "13px",
                right: "20px",
                width: "30px",
                cursor: "pointer",
              }}
              onClick={this.shareScreen}
            >
              <img src={ScreenShare} alt="share-screen" />
            </div> */}

            {this.state.pushDown ? (
              <div id="bars">
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
              </div>
            ) : null}
            {this.props.muteSource === true || this.state.pushDown === false ? (
              <img
                style={{ position: "absolute", top: "5px", right: "5px" }}
                src={Mute}
                alt="mute"
                width="60px"
              />
            ) : null}
          </div>
        </div>
      </>
    );
  }
}

export default LocalDynamicTracks;
