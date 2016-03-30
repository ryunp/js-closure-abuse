# js-closure-abuse
An exploration into closures, and Object.bind()


### Original code piece

    Synth.prototype.sequence = function(queue, bpm, loops){

      // Get BPM delay in milliseconds
      var calculated_bpm = this.calculateBpm(bpm);

      // Play each sound, then wait for the offset
      for(i=0; i < queue.length; i++){
        ((function(offset){
          setTimeout((function(){
            this.play(queue[offset]);
          }).bind(this), offset * calculated_bpm)
        }).bind(this))(i);
      }
    };

[a](Source)
