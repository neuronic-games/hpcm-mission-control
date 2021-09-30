import React, { Component } from "react";
import _ from "lodash";
import { componentGetCompareProps } from "./Shared";
import "./css/style.css";
import "./libjitsi.css";
import Mute from "../images/mute.png";

export class RemoteTrack extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedVideoId: "",
      selectedMicId: "",
      name: "",
      isMuted: "",
      isUserMuted: [],
    };
    this.videoRef = React.createRef();
    this.micRef = React.createRef();
    this.tracks = [];
  }

  componentDidMount() {
    const { trackIds = [], selectedSpeakerDeviceId } = this.props;

    this.tracks = _.filter(window.libjisti.remoteTracks, (rt) => {
      return _.indexOf(trackIds, rt.id) !== -1;
    });
    let videoTrack = _.find(this.tracks, { type: "video" });
    let micTrack = _.find(this.tracks, { type: "audio" });
    if (videoTrack || micTrack) {
      let newState = {};
      if (videoTrack) {
        this.updateTrack(videoTrack, "set");
        newState.selectedVideoId = videoTrack.id;
      }
      if (micTrack) {
        this.updateTrack(micTrack, "set");
        newState.selectedMicId = micTrack.id;
        micTrack.track.setAudioOutput(selectedSpeakerDeviceId);
      }
      this.setState(newState);
    }
  }

  componentDidUpdate(prevProps) {
    const trackIds = componentGetCompareProps(
      "trackIds",
      this.props,
      prevProps,
      []
    );

    const currentTrackIdText = _.map(trackIds.Current, (ct) => {
      return ct.id;
    }).join(",");
    const previousTrackIdText = _.map(trackIds.Previous, (pt) => {
      return pt.id;
    }).join(",");

    if (currentTrackIdText !== previousTrackIdText) {
      let participantId = _.first(
        _.map(trackIds.Current, (tid) => tid.participantId)
      );
      this.tracks = _.filter(window.libjisti.remoteTracks, {
        participantId: participantId,
      });

      let videoTrack = _.find(this.tracks, { type: "video" });
      let micTrack = _.find(this.tracks, { type: "audio" });
      let newState = {};
      if (videoTrack) {
        console.log(videoTrack, "log2remote");
        const { selectedVideoId } = this.state;
        if (/*videoTrack.id !== selectedVideoId*/ 2 > 1) {
          let oldVideoTrack = _.find(this.tracks, { id: selectedVideoId });
          if (oldVideoTrack) {
            console.log(oldVideoTrack, "log2remote");
            this.updateTrack(oldVideoTrack, "clear");
          }
          this.updateTrack(videoTrack, "set");
          newState.selectedVideoId = videoTrack.id;
          console.log("log2remote");
        }
        console.log({ id: videoTrack.id, selectedVideoId }, "log2remote");
      }
      if (micTrack) {
        const { selectedMicId } = this.state;
        if (micTrack.id !== selectedMicId) {
          const { selectedSpeakerDeviceId } = this.props;
          let oldMicTrack = _.find(this.tracks, { id: selectedMicId });
          if (oldMicTrack) {
            this.updateTrack(oldMicTrack, "clear");
          }
          this.updateTrack(micTrack, "set");
          micTrack.track.setAudioOutput(selectedSpeakerDeviceId);
          newState.selectedMicId = micTrack.id;
        }
      }
      this.setState(newState);
    }

    const selectedSpeakerDeviceId = componentGetCompareProps(
      "selectedSpeakerDeviceId",
      this.props,
      prevProps,
      ""
    );

    if (selectedSpeakerDeviceId.HasChanged) {
      const { selectedMicId } = this.state;
      let micTrack = _.find(this.tracks, { id: selectedMicId });
      if (micTrack) {
        micTrack.track.setAudioOutput(selectedSpeakerDeviceId.Current);
      }
    }
  }

  componentWillUnmount() {
    const { selectedVideoId, selectedMicId } = this.state;
    let videoTrack = _.find(this.tracks, { id: selectedVideoId });
    if (videoTrack) {
      try {
        this.updateTrack(videoTrack, "clear");
      } catch (error) {
        console.log(error.message);
      }
    }
    let micTrack = _.find(this.tracks, { id: selectedMicId });
    if (micTrack) {
      try {
        this.updateTrack(micTrack, "clear");
      } catch (error) {
        console.log(error.message);
      }
    }
  }

  updateTrack = (track, action = "clear") => {
    if (action === "clear") {
      if (track) {
        // eslint-disable-next-line default-case
        switch (track.type) {
          case "audio":
            if (this.micRef.current) {
              track.track.detach(this.micRef.current);
            }
            break;
          case "video":
            if (this.videoRef.current) {
              track.track.detach(this.videoRef.current);
            }
            break;
        }
      }
    } else if (action === "set") {
      console.log(action, "log2remote");
      if (track) {
        // eslint-disable-next-line default-case
        switch (track.type) {
          case "audio":
            if (this.micRef.current) {
              track.track.attach(this.micRef.current);
            }
            break;
          case "video":
            if (this.videoRef.current) {
              console.log("it will work ", "log3");
              track.track.attach(this.videoRef.current);
            }
            break;
        }
      }
    }
  };

  render() {
    if (this.micRef.current && this.props.speakerMuted === true) {
      this.micRef.current.muted = true;
    } else if (this.micRef.current && this.props.speakerMuted === false) {
      this.micRef.current.muted = false;
    } else {
      console.log("papaerrinremotemute");
    }

    return (
      <>
        <video
          className="d-flex"
          autoPlay="1"
          ref={this.videoRef}
          style={{
            backgroundColor: "#000000",
            height: "100%",
            width: "100%",
            objectFit: "cover",
            border: "2px solid #ACACAC",
            borderRadius: "20px",
          }}
        />
        <audio autoPlay="1" ref={this.micRef} />
        <div
          style={{
            color: "white",
            fontSize: "24px",
            fontWeight: "semibold",
            top: "5px",
            left: "15px",
          }}
          className="position-absolute name"
        >
          {this.props.name}
        </div>
        {/* {this.props.userChangeId !== this.props.id &&
        this.props.muteSource === true ? (
          <img
            style={{
              position: "absolute",
              top: "5px",
              right: "5px",
              display:
                this.props.pushDown === true &&
                this.props.pushedUser === this.props.id
                  ? "none"
                  : "",
            }}
            src={Mute}
            alt="Mute"
            width="25px"
          />
        ) : null} */}

        <img
          style={{
            position: "absolute",
            top: "5px",
            right: "5px",
            display:
              this.props.pushDown === true &&
              this.props.pushedUser === this.props.id
                ? "none"
                : "",
          }}
          src={Mute}
          alt="Mute"
          width="60px"
        />

        {this.props.pushDown === true &&
        this.props.pushedUser === this.props.id ? (
          <div id="bars">
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
        ) : null}

        {/* {this.props.muteSource !== true ||
        (this.props.pushDown === true &&
          this.props.pushedUser === this.props.id) ? null : (
            <img
              style={{ position: "absolute", top: "5px", right: "5px" }}
              src={Mute}
              alt="mute"
              width="60px"
            />
          )} */}
      </>
    );
  }
}

export default RemoteTrack;
