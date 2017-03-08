class StreamCoordinator {

  /**
   * StreamCoordinator constructor
   *
   * Basically, this sort of *looks* like Streamer in terms of the API,
   * but it actually synchronizes *multiple* streamer instances
   *
   * @method constructor
   *
   * @param  {Array}      urls  – array of audio asset url
   * @param  {AudioStore} store – AudioStore instance
   * @return {StreamCoordinator}
   */

  constructor( urls, store ) {
    this.ac     = store.ac;
    this.store  = store;
    this.urls   = urls;

    this.streamers = this.urls.map( url => new Streamer( url, store ) );

    // throwaway audio buffer
    this.garbageBuffer = this.ac.createBuffer( 1, 1, 44100 );

    this.startTime   = null;
    this.startOffset = null;

    this.stopped = true;
    this.ready   = false;
  }

  /**
   * Begin playback at the supplied offset (or resume playback)
   *
   * @method stream
   *
   * @param  {Number}        offset – offset in seconds (defaults to 0 or last time )
   * @return {StreamCoordinator}
   */

  stream( offset ) {
    if ( typeof offset !== 'number' ) {
      offset = this.startOffset !== null ? this.startOffset : 0;
    }

    const promises = this.streamers.map( streamer => streamer.prime( offset ) );

    Promise.all( promises ).then( () => {
      if ( this.startTime === null ) {
        this.startTime = this.ac.currentTime;
      }

      this.streamers.forEach( streamer => streamer.stream( offset ) );
    });
    this.stopped = false;
    this.startOffset = offset;

    return this;
  }

  /**
   * stop all playback
   *
   * @method stop
   *
   * @return {StreamCoordinator}
   */

  stop() {
    if ( this.stopped ) {
      return;
    }

    this.streamers.forEach( streamer => streamer.stop() );

    this.stopped = true;

    const elapsed = this.ac.currentTime - this.startTime;

    this.startTime = null;
    this.startOffset += elapsed;

    if ( this.startOffset >= this.duration ) {
      this.startOffset = 0;
    }
  }

  /**
   * return the current cursor position in seconds
   *
   * @method currentTime
   *
   * @return {Number}    – current playback position in seconds
   */

  currentTime() {
    if ( this.stopped ) {
      return this.startOffset;
    }

    const start   = this.startTime || this.ac.currentTime;
    const offset  = this.startOffset || 0;
    const elapsed = this.ac.currentTime - start;

    const current = offset + elapsed;

    if ( current >= this.duration ) {
      this.stop();
      return 0;
    }

    return current;
  }

  /**
   * set the current cursor position in seconds
   *
   * @method seek
   * @param  {Number}        offset – offset in seconds
   * @return {StreamCoordinator}
   */

  seek( offset ) {
    if ( !this.stopped ) {
      this.stop();
      this.stream( offset );
    } else {
      this.startOffset = offset;
    }
  }

  /**
   * load all audio assets in `this.urls`
   *
   * @method load
   *
   * @return {Promise} – resolves with `true`
   */

  load() {
    const promises = this.streamers.map( streamer => streamer.load() );
    return Promise.all( promises )
    .then( () => {
      const durations = this.streamers.map( streamer => streamer.duration );
      this.duration = Math.max.apply( Math, durations );
    });
  }

  /**
   * solo the streamer at the given index (same as the order of `this.urls`)
   *
   * @method solo
   *
   * @param  {Number}        index – streamer index
   * @return {StreamCoordinator}
   */

  solo( index ) {
    this.streamers.forEach( streamer => streamer.gain.gain.value = 0 );
    this.streamers[ index ].gain.gain.value = 1;
  }

}
