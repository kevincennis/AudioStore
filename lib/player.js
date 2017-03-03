class Player {

  /**
   * Player constructor
   *
   * @method constructor
   *
   * @param  {HTMLElement} el       – target element
   * @param  {Streamer}    streamer – Streamer instance
   * @return {Player}
   */

  constructor( el, streamer ) {
    this.el       = el;
    this.streamer = streamer;
    this.button   = el.querySelector('.button');
    this.track    = el.querySelector('.track');
    this.progress = el.querySelector('.progress');
    this.scrubber = el.querySelector('.scrubber');
    this.message  = el.querySelector('.message');

    this.bindEvents();
    this.draw();
  }

  /**
   * bind event handlers
   *
   * @method bindEvents
   *
   * @return {Undefined}
   */

  bindEvents() {
    this.button.addEventListener( 'click', e => this.toggle( e ) );
    this.scrubber.addEventListener( 'mousedown', e => this.onMouseDown( e ) );
    this.track.addEventListener( 'click', e => this.onClick( e ) );
    window.addEventListener( 'mousemove', e => this.onDrag( e ) );
    window.addEventListener( 'mouseup', e => this.onMouseUp( e ) );
  }

  /**
   * begin playback at offset
   *
   * @method play
   *
   * @param  {Number} position – offset in seconds
   * @return {Player}
   */

  play( position ) {
    this.pause();
    this.streamer.stream( position );
    this.playing = true;
    return this;
  }

  /**
   * pause playback
   *
   * @method pause
   *
   * @return {Player}
   */

  pause() {
    this.streamer.stop();
    this.playing = false;
    return this;
  }

  /**
   * set playback offset
   *
   * @method seek
   *
   * @param  {Number} position – offset in seconds
   * @return {Player}
   */

  seek( position ) {
    position = Math.min( position, this.streamer.duration - 0.5 );
    this.streamer.seek( position );
    return this;
  }

  /**
   * get the current playback offset
   *
   * @method seek
   *
   * @param  {Number}
   * @return {Number} – offset in seconds
   */

  updatePosition() {
    this.position = this.streamer.currentTime();
    if ( this.streamer.stopped ) {
      this.pause();
    }
    return this.position;
  }

  /**
   * toggle between play and pause
   *
   * @method toggle
   *
   * @return {Player}
   */

  toggle() {
    if ( !this.playing ) {
      this.play();
    }
    else {
      this.pause();
    }
    return this;
  }

  /**
   * handle mousedown events for dragging
   *
   * @method onMouseDown
   *
   * @param  {Event}    e – mousedown events
   * @return {Undefined}
   */

  onMouseDown( e ) {
    this.dragging = true;
    this.startX = e.pageX;
    this.startLeft = parseInt( this.scrubber.style.left || 0, 10 );
  }

  /**
   * handle mousemove events for dragging
   *
   * @method onDrag
   *
   * @param  {Event}    e – mousemove events
   * @return {Undefined}
   */

  onDrag( e ) {
    if ( !this.dragging ) {
      return;
    }
    const width    = this.track.offsetWidth;
    const position = this.startLeft + ( e.pageX - this.startX );
    const left     = Math.max( Math.min( width, position ), 0 );

    this.scrubber.style.left = left + 'px';
  }

  /**
   * handle mouseup events for dragging
   *
   * @method onMouseUp
   *
   * @param  {Event}    e – mouseup events
   * @return {Undefined}
   */

  onMouseUp( e ) {
    let isClick = false;
    let target  = e.target;

    while ( target ) {
      isClick = isClick || target === this.track;
      target = target.parentElement;
    }

    if ( this.dragging && !isClick ) {
      const width = this.track.offsetWidth;
      const left  = parseInt( this.scrubber.style.left || 0, 10 );
      const pct   = Math.min( left / width, 1 );
      const time  = this.streamer.duration * pct;
      this.seek( time );
      this.dragging = false;
      return false;
    }
  }

  /**
   * handle click events for seeking
   *
   * @method onClick
   *
   * @param  {Event}    e – click events
   * @return {Undefined}
   */

  onClick( e ) {
    const width    = this.track.offsetWidth;
    const offset   = this.track.offsetLeft;
    const left     = e.pageX - offset;
    const pct      = Math.min( left / width, 1 );
    const time     = this.streamer.duration * pct;

    this.seek( time );

    this.scrubber.style.left = left + 'px';

    this.dragging = false;
    this.moved = false;
  }

  /**
   * update scrubber and progress bar positions
   *
   * @method draw
   *
   * @return {Player}
   */

  draw() {
    const progress = ( this.updatePosition() / this.streamer.duration );
    const width    = this.track.offsetWidth;

    if ( this.playing ) {
      this.button.classList.add('fa-pause');
      this.button.classList.remove('fa-play');
    } else {
      this.button.classList.add('fa-play');
      this.button.classList.remove('fa-pause');
    }

    this.progress.style.width = ( progress * width ) + 'px';

    if ( !this.dragging ) {
      this.scrubber.style.left = ( progress * width ) + 'px';
    }

    requestAnimationFrame( () => this.draw() );
  }

}
