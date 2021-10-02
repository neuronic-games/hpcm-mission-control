import React, { Component } from "react";
import "./css/style.css";
import { LocalDynamicTracks } from "./LocalDynamicTracks";
import _ from "lodash";
import { RemoteTrack } from "./RemoteTrack";
import { v4 as uuidv4 } from "uuid";
import queryString from "query-string";

export class Page extends Component {
  constructor(props) {
    super(props);
    this.myName =
      JSON.parse(localStorage.getItem("user")) !== null
        ? JSON.parse(localStorage.getItem("user")).firstName
        : "Rob" + Math.floor(Math.random() * 90 + 10);
    this.state = {
      layout: 1,
      serverURL: "meet.jit.si",
      roomId: "",
      jwt: false,
      name: "",
      selectedSpeakerDeviceId: "",
      defaultMicId: "",
      defaultVideoId: "",
      defaultSpeakerId: "",
      deviceList: [],
      lastError: "",
      remoteTrackIds: [],
      loaded: false,
      activeRoomId: null,
      moderatorId: null,
      isUserMuted: [],
      error: null,
      speakerMuted: false,
      isConnected: true,
      userName: this.props.match.params.name,
      muteSource: null,
      userChangeId: null,
      pushDown: false,
      pushedUser: null,
    };

    window.libjisti = {};
    window.libjisti.remoteTracks = [];
    window.libjisti.activeConnection = null;
    window.libjisti.activeRoom = null;
  }

  componentDidMount() {
    //it might work from page
    /* window.JitsiMeetJS.createLocalTracks({
      devices: ["audio", "video"],
    }); */
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
      let speakerId =
        (_.find(newDeviceList, { type: "audiooutput" }) || {}).id || "none";
      // console.log(speakerId, "deviceid");
      /*** If cam parameter present in querystring '?cam=1' then select the camera accordingly [[ ****/
      let videoId = "none";
      let videoInputs = _.filter(newDeviceList, function (o) {
        return o.type == "videoinput";
      });
      let queryStringValues =
        queryString.parse(this.props.location.search) || {};
      let defaultCamera = 1;
      if (!_.isEmpty(queryStringValues)) {
        defaultCamera = parseInt(queryStringValues.cam) || defaultCamera;
      }
      if (videoInputs.length > 0 && defaultCamera > 0) {
        videoId = !_.isUndefined(videoInputs[defaultCamera - 1])
          ? videoInputs[defaultCamera - 1].id
          : videoInputs[0].id;
      }
      /**************** ]] ************* */

      /** If room parameter present in querystring '?room=hga2324Test' then set that room else default [[ */
      let defaultRoomId = queryStringValues.room || "3224fhsahfa3fal086test";
      defaultRoomId = defaultRoomId.toLowerCase();
      /**************** ]] ************* */
      this.setState({
        roomId: defaultRoomId,
        deviceList: newDeviceList,
        defaultMicId: micId,
        defaultVideoId: videoId,
        defaultSpeakerId: speakerId,
        loaded: true,
      });
    });

    window.JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);
  }

  onSpeakerChanged = (newSpeaker) => {
    if (newSpeaker) {
      this.setState({
        selectedSpeakerDeviceId: newSpeaker.id,
      });
    }
  };

  onServerChanged = (event) => {
    this.setState({
      serverURL: event.target.value,
    });
  };

  onRoomChanged = (event) => {
    this.setState({
      roomId: event.target.value,
    });
  };

  onRoomTrackAdded = (track) => {
    if (track.isLocal() === true) {
      return;
    }
    let newTrackId = track.getId();
    let matchTrack = _.find(window.libjisti.remoteTracks, { id: newTrackId });
    if (matchTrack) {
      return;
    }
    this.setState(
      (prevState) => ({
        isUserMuted: [
          ...prevState.isUserMuted,
          {
            participantId: track.getParticipantId(),
            isMuted: false,
          },
        ],
      }),
      () => {
        const uniqueObjects = [
          ...new Map(
            this.state.isUserMuted.map((item) => [item?.participantId, item])
          ).values(),
        ];
        this.setState(
          (prevState) => ({
            isUserMuted: uniqueObjects,
          }),
          () => {
            let newArr = [];
            this.state.isUserMuted.forEach((val, index) => {
              newArr[val?.participantId] = {
                participantId: val?.participantId,
                isMuted: val?.isMuted,
              };
              if (this.state.isUserMuted.length - 1 == index) {
                this.setState({
                  isUserMuted: newArr,
                });
              }
            });
          }
        );
      }
    );
    let trackInfo = {
      id: newTrackId,
      name: this.state.name,
      participantId: track.getParticipantId(),
      type: track.getType(),
      track: track,
    };
    window.libjisti.remoteTracks.push(trackInfo);
    this.setState({
      remoteTrackIds: _.map(window.libjisti.remoteTracks, (rt) => {
        console.log(rt.id, "log2");
        return {
          id: rt.id,
          participantId: rt.participantId,
          participantName: rt.name,
        };
      }),
    });
  };

  onRoomTrackRemoved = (track) => {
    if (track.isLocal() === true) {
      return;
    }
    let trackId = track.getId();
    window.libjisti.remoteTracks = _.reject(window.libjisti.remoteTracks, {
      id: trackId,
    });
    this.setState({
      remoteTrackIds: _.map(window.libjisti.remoteTracks, (rt) => {
        return { id: rt.id, participantId: rt.participantId };
      }),
    });
  };

  onConferenceJoined = () => {
    if (window.libjisti.activeRoom.getParticipants().length > 4) {
      window.libjisti.activeRoom.leave().then(() => {
        if (window.libjisti.activeConnection) {
          window.libjisti.activeConnection.disconnect();
        }
        this.setState({
          remoteTracks: [],
          activeRoomId: null,
        });
      });
    }
  };

  onParticipantPropertyChange = (user, key, oldValue, value) => {
    console.log({ user, key, oldValue, value });
    if (key == "muteSource" && value == "true") {
      this.setState({ muteSource: true, userChangeId: user._id });
    } else if (key == "muteSource" && value == "false") {
      this.setState({ muteSource: false });
    } else if (key == "pushDown" && value == "true") {
      this.setState({ pushDown: true, pushedUser: user._id });
    } else if (key == "pushDown" && value == "false") {
      this.setState({ pushDown: false });
    } else {
      this.setState({ muteSource: null });
    }
  };

  onConnectionSuccess = () => {
    const { roomId, name } = this.state;
    try {
      window.libjisti.activeRoom =
        window.libjisti.activeConnection.initJitsiConference(roomId, {
          openBridgeChannel: true,
        });
      window.libjisti.activeRoom.on(
        window.JitsiMeetJS.events.conference.TRACK_ADDED,
        this.onRoomTrackAdded
      );
      window.libjisti.activeRoom.on(
        window.JitsiMeetJS.events.conference.TRACK_REMOVED,
        this.onRoomTrackRemoved
      );
      window.libjisti.activeRoom.on(
        window.JitsiMeetJS.events.conference.CONFERENCE_JOINED,
        this.onConferenceJoined
      );
      window.libjisti.activeRoom.setLocalParticipantProperty(
        "name",
        this.state.userName
      );
      window.libjisti.activeRoom.on(
        window.JitsiMeetJS.events.conference.PARTICIPANT_PROPERTY_CHANGED,
        this.onParticipantPropertyChange
      );
      window.libjisti.activeRoom.on(
        window.JitsiMeetJS.events.conference.KICKED,
        (actorParticipant, reason) => {
          window.libjisti.remoteTracks = [];
          this.setState(
            {
              remoteTrackIds: [],
              activeRoomId: null,
            },
            () => alert(reason)
          );
        }
      );

      window.libjisti.activeRoom.join();

      this.setState({
        lastError: "",
        activeRoomId: uuidv4(),
      });
    } catch (error) {
      this.setState({
        lastError: error.message,
      });
    }
  };

  onConnectionFailed = (a, b, c, d) => {
    this.setState({
      lastError: a,
      activeRoomId: null,
    });
  };

  onConnectionDisconnect = () => {
    window.libjisti.activeConnection.removeEventListener(
      window.JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
      this.onConnectionSuccess
    );
    window.libjisti.activeConnection.removeEventListener(
      window.JitsiMeetJS.events.connection.CONNECTION_FAILED,
      this.onConnectionFailed
    );
    window.libjisti.activeConnection.removeEventListener(
      window.JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
      this.onConnectionDisconnect
    );
  };

  onConnect = () => {
    const { roomId, serverURL } = this.state;

    window.libjisti.activeConnection = new window.JitsiMeetJS.JitsiConnection(
      null,
      null,
      {
        serviceUrl: `https://${serverURL}/http-bind?room=${roomId}`,
        hosts: {
          domain: serverURL,
          muc: `conference.${serverURL}`, // FIXME: use XEP-0030
        },
      }
    );

    window.libjisti.activeConnection.addEventListener(
      window.JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
      this.onConnectionSuccess
    );
    window.libjisti.activeConnection.addEventListener(
      window.JitsiMeetJS.events.connection.CONNECTION_FAILED,
      this.onConnectionFailed
    );
    window.libjisti.activeConnection.addEventListener(
      window.JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
      this.onConnectionDisconnect
    );
    window.libjisti.activeConnection.connect();
  };

  renderTracks = (trackGroups = {}, selectedSpeakerDeviceId) => {
    let ret = [];

    let participantIds = _.keys(trackGroups);
    if (participantIds.length === 0) {
      return null;
    }
    let width;
    if (
      participantIds.length == 1 ||
      participantIds.length == 2 ||
      participantIds.length == 3 ||
      participantIds.length == 4
    ) {
      width = 50;
    } else if (
      participantIds.length == 5 ||
      participantIds.length == 6 ||
      participantIds.length == 7 ||
      participantIds.length == 8
    ) {
      width = 33.33;
    }

    for (let participantId of participantIds) {
      const name = _.find(window.libjisti.activeRoom.getParticipants(), {
        _id: participantId,
      })?._properties?.name;

      ret.push(
        <div
          key={participantId}
          className={`${name} fullsize mx-auto position-relative`}
          style={{
            height: "44vh",
            padding: "10px",
            // width: "50%",
            display: "inline-block",
          }}
        >
          <div
            id={participantId}
            style={{
              aspectRatio: "16 / 9",
              height: "100%",
              // margin: "auto",
              position: "relative",
            }}
          >
            <RemoteTrack
              name={name}
              id={participantId}
              trackIds={trackGroups[participantId]}
              selectedSpeakerDeviceId={selectedSpeakerDeviceId}
              speakerMuted={this.state.speakerMuted}
              muteSource={this.state.muteSource}
              userChangeId={this.state.userChangeId}
              users={window?.libjisti?.activeRoom?.getParticipants()}
              pushDown={this.state.pushDown}
              pushedUser={this.state.pushedUser}
            />
          </div>
        </div>
      );
      // }
    }

    return ret;
  };

  muteSpeaker = (id) => {
    this.setState({ speakerMuted: true });
  };

  unmuteSpeaker = () => {
    this.setState({ speakerMuted: false });
  };

  render() {
    const {
      layout,
      selectedSpeakerDeviceId,
      defaultMicId,
      defaultSpeakerId,
      defaultVideoId,
      deviceList,
      loaded = false,
      remoteTrackIds,
      activeRoomId,
    } = this.state;
    if (loaded === false) {
      return (
        <div className="App">
          <div className="AppLoading">
            <h3>Loading...</h3>
          </div>
        </div>
      );
    }

    let remoteTrackGroups = _.groupBy(remoteTrackIds, (rt) => {
      return rt.participantId;
    });

    return (
      <>
        <div
          className="block34 d-flex justify-content-center align-items-center "
          style={{
            height: "100%",
          }}
        >
          {layout == 1 && (
            <>
              <div
                style={{
                  width: "fit-content",
                  height: "100%",
                  padding: "5px",
                  margin: "20px",
                  height: "90%",
                  // display: "flex",
                  // flexWrap: "wrap",
                  border: "4px solid white",
                  borderRadius: "35px",
                  margin: "auto",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  position: "relative",
                  background: "black",
                  // gridAutoRows: "1fr",
                  // gap: "5px",
                }}
              >
                <LocalDynamicTracks
                  name={this.state.userName}
                  onConnect={this.onConnect}
                  remoteTrackIds={remoteTrackIds}
                  activeRoomId={activeRoomId}
                  deviceList={deviceList}
                  defaultMicId={defaultMicId}
                  defaultSpeakerId={defaultSpeakerId}
                  defaultVideoId={defaultVideoId}
                  key="localTracks"
                  muteSpeaker={this.muteSpeaker}
                  unmuteSpeaker={this.unmuteSpeaker}
                  muteSource={this.state.muteSource}
                />
                {this.renderTracks(remoteTrackGroups, selectedSpeakerDeviceId)}
                <div className="page-ex1"></div>
                <div className="page-ex2"></div>
              </div>
            </>
          )}
        </div>
      </>
    );
  }
}

export default Page;
