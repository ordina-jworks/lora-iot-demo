var LedStripUtils = function(ledStrip, amountOfLeds) {
    var logger          = require("../../logging/logger").makeLogger("UTIL-LEDSTRIP--");

    //Private constants.
    const self            = this;
    const framerate       = 8;//Any value higher than 8 starts to give problems (some LEDs not working, massive delays...)
    const ledCount        = amountOfLeds;

    var animationRunning  = false;

    //Private variables.
    var fadeVars = {
        steps: 0,
        currentStep: 0,
        durationPerStep: 0,
        fadeInterval: null,

        additions: null,
        floatColors: null,
        newColors: null,
        clbck: null
    };

    var cycleVars = {
        currentCycle: 0,
        maxCycles: 0,

        cyclesColors: null,
        cycleDuration: null
    };

    var offsetVars = {
        colors: ["rgb(255, 0, 0)","rgb(0, 0, 255)","rgb(255, 255, 255)"],
        colorOffset: 0
    };

    var scrollVars = {
        steps: 0,
        currentStep: 0,
        durationPerStep: 0,
        ledsPerStep: 0,
        scrollInterval: null,

        scrollUp: false,
        newColors: null,
        clbck: null
    };

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Public functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    //////////////////////////////////////////////////////////////////////
    //BASIC ANIMATIONS:
    //////////////////////////////////////////////////////////////////////
    /**
     * Fades the current colors of the led strip to the given color over the given time.
     * When the animation completes, the callback function is called.
     *
     * @param targetColors JSON color object: {"R": number, "G": number, "B": number}
     * @param fadeDuration Duration for the fade in milliseconds
     * @param callback Function to call when the fade has completed.
     */
    this.fade = function(targetColors, fadeDuration, callback) {
        animationRunning = true;

        fadeVars.currentStep     = 0;
        fadeVars.steps           = fadeDuration / (1000 / framerate);
        fadeVars.durationPerStep = fadeDuration / fadeVars.steps;
        fadeVars.newColors       = targetColors;
        fadeVars.clbck           = callback;

        fadeVars.floatColors     = [];
        fadeVars.additions       = [];

        for(var i = 0; i < ledCount; i++) {
            var ledColors       = ledStrip.pixel(i).color();

            var floatColor      = {};
            floatColor.r        = ledColors.r;
            floatColor.g        = ledColors.g;
            floatColor.b        = ledColors.b;
            fadeVars.floatColors.push(floatColor);

            var addition        = {};
            addition.redStep    = (targetColors.R - floatColor.r) / fadeVars.steps;
            addition.greenStep  = (targetColors.G - floatColor.g) / fadeVars.steps;
            addition.blueStep   = (targetColors.B - floatColor.b) / fadeVars.steps;
            fadeVars.additions.push(addition);
        }

        fadeVars.fadeInterval = setInterval(fadeStep, fadeVars.durationPerStep);
    };

    /**
     *
     * @param targetColors
     * @param scrollDuration
     * @param callback
     */
    this.scroll = function(targetColors, scrollDuration, callback) {
        animationRunning = true;

        //For smaller LED chunk updates the frame rate can be higher than 8, much higher!
        var framerateSmall          = 30;

        scrollVars.currentStep      = 0;
        scrollVars.steps            = scrollDuration / (1000 / framerateSmall);
        scrollVars.durationPerStep  = scrollDuration / scrollVars.steps;
        scrollVars.ledsPerStep      = Math.ceil(ledCount / scrollVars.steps);
        scrollVars.newColors        = targetColors;
        scrollVars.clbck            = callback;

        scrollVars.scrollInterval = setInterval(scrollStep, scrollVars.durationPerStep);
    };

    //////////////////////////////////////////////////////////////////////
    //COMPLEX ANIMATIONS:
    //////////////////////////////////////////////////////////////////////

    /**
     *
     * @param targetColorsArray
     * @param singleFadeDuration
     */
    this.startCycleFade = function(targetColorsArray, singleFadeDuration){
        animationRunning = true;

        cycleVars.currentCycle  = 0;
        cycleVars.maxCycles     = targetColorsArray.length;

        cycleVars.cyclesColors  = targetColorsArray;
        cycleVars.cycleDuration = singleFadeDuration;

        fadeCycle();
    };

    /**
     *
     */
    this.startOffsetAnimation = function() {
        animationRunning = true;

        offsetCycle();
    };

    /**
     *
     * @param targetColorsArray
     * @param singleScrollDuration
     */
    this.startScrollerAnimation = function(targetColorsArray, singleScrollDuration) {
        animationRunning = true;

        cycleVars.currentCycle  = 0;
        cycleVars.maxCycles     = targetColorsArray.length;

        cycleVars.cyclesColors  = targetColorsArray;
        cycleVars.cycleDuration = singleScrollDuration;

        ledStrip.color("rgb(0, 0, 0)");
        ledStrip.show();

        setTimeout(scrollCycle, 250);
    };

    /**
     * Stops the currently running animation.
     * It is advised to wait 125 to 250ms after calling this function before starting any new animation!
     */
    this.stopAnimation = function() {
        animationRunning = false;
    };

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Private functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    //////////////////////////////////////////////////////////////////////
    //FADE ANIMATIONS:
    //////////////////////////////////////////////////////////////////////
    /**
     *
     */
    function fadeCycle() {
        logger.INFO("Fade cycle started!");

        //Hold the current color for one whole second.
        setTimeout(function() {
            if(cycleVars.currentCycle === cycleVars.maxCycles) {
                cycleVars.currentCycle = 0;
            }
            if(!animationRunning) {
                return;
            }

            var targetColor = cycleVars.cyclesColors[cycleVars.currentCycle++];
            self.fade(targetColor, cycleVars.cycleDuration, fadeCycle);
        }, 1000);
    }

    /**
     * Performs 1 step in the fade animation.
     * If the current step is the last step, the interval for the animation will be cleared.
     */
    function fadeStep() {
        logger.DEBUG("Fade step: " + fadeVars.currentStep);

        //Animation step calculations.
        for(var i = 0; i < ledCount; i++) {
            var led         = ledStrip.pixel(i);
            var addition    = fadeVars.additions[i];

            var floatColor  = fadeVars.floatColors[i];

            var newR = floatColor.r + addition.redStep;
            var newG = floatColor.g + addition.greenStep;
            var newB = floatColor.b + addition.blueStep;

            floatColor.r = Math.min(Math.max(0, newR), 255);
            floatColor.g = Math.min(Math.max(0, newG), 255);
            floatColor.b = Math.min(Math.max(0, newB), 255);

            var newColor = "rgb(" + Math.floor(floatColor.r) + "," + Math.floor(floatColor.g) + "," + Math.floor(floatColor.b) + ")";
            //logger.INFO("Fade step: " + currentStep + " " + newColor);
            led.color(newColor);
        }
        ledStrip.show();

        //Check to see if the animation needs to stop, or if this was the last step in the animation.
        if(animationRunning === false || fadeVars.currentStep++ == fadeVars.steps - 1) {
            logger.INFO("Fade completed!");

            //This last fade is required because the last is not the correct target color, this is because of float rounding errors!
            ledStrip.color("rgb(" + fadeVars.newColors.r + "," + fadeVars.newColors.g + "," + fadeVars.newColors.b + ")");
            ledStrip.show();

            fadeVars.currentStep = 0;
            //Clear the animation interval.
            clearInterval(fadeVars.fadeInterval);
            //Call the callback function. (only when the animation is still running)
            if(animationRunning) {
                fadeVars.clbck();
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    //OFFSET ANIMATIONS:
    //////////////////////////////////////////////////////////////////////
    /**
     *
     */
    function offsetCycle() {
        logger.DEBUG("Offset cycle step");

        if(offsetVars.colorOffset === offsetVars.colors.length) {
            offsetVars.colorOffset = 0;
        }
        if(!animationRunning) {
            return;
        }

        for(var i = offsetVars.colorOffset; i < (ledCount + offsetVars.colorOffset); i+=3) {
            var modI = i >= 60 ? i - 60 : i;
            var modI1 = (i + 1) >= 60 ? (i + 1) - 60 : (i + 1);
            var modI2 = (i + 2) >= 60 ? (i + 2) - 60 : (i + 2);
            ledStrip.pixel(modI).color(offsetVars.colors[0]);
            ledStrip.pixel(modI1).color(offsetVars.colors[1]);
            ledStrip.pixel(modI2).color(offsetVars.colors[2]);
        }
        ledStrip.show();
        offsetVars.colorOffset++;

        //Start the next cycle after the given timeout (125ms => 8Hz, the maximum frame rate!)
        setTimeout(offsetCycle, 125);
    }

    //////////////////////////////////////////////////////////////////////
    //SCROLL ANIMATIONS:
    //////////////////////////////////////////////////////////////////////
    /**
     *
     */
    function scrollCycle() {
        logger.INFO("Scroll cycle started!");

        //Hold the current color for one whole second.
        setTimeout(function() {
            if(cycleVars.currentCycle === cycleVars.maxCycles) {
                cycleVars.currentCycle = 0;
            }
            if(!animationRunning) {
                return;
            }

            //Flip flop the scroll direction!
            scrollVars.scrollUp = !scrollVars.scrollUp;

            var targetColor = cycleVars.cyclesColors[cycleVars.currentCycle++];
            self.scroll(targetColor, cycleVars.cycleDuration, scrollCycle);
        }, 1000);
    }

    /**
     *
     */
    function scrollStep() {
        logger.DEBUG("Scroll step: " + scrollVars.currentStep);

        if(scrollVars.scrollUp === true) {
            //Scroll up:
            for(var i = scrollVars.currentStep * scrollVars.ledsPerStep; i < (scrollVars.currentStep * scrollVars.ledsPerStep) + scrollVars.ledsPerStep; i++) {
                //Abort when we have reached the last LED!
                if(i >= ledCount) {
                    break;
                }
                logger.DEBUG("Setting LED: " + i);

                var led = ledStrip.pixel(i);
                led.color("rgb(" + scrollVars.newColors.R + "," + scrollVars.newColors.G + "," + scrollVars.newColors.B + ")");
            }
        } else {
            //Scroll down:
            for(var j = (ledCount - 1) - (scrollVars.currentStep * scrollVars.ledsPerStep); j > (ledCount - (scrollVars.ledsPerStep * (scrollVars.currentStep + 1)) - 1); j--) {
                //Abort when we have reached the first LED!
                if(j < 0) {
                    break;
                }
                logger.DEBUG("Setting LED: " + j);

                var led = ledStrip.pixel(j);
                led.color("rgb(" + scrollVars.newColors.R + "," + scrollVars.newColors.G + "," + scrollVars.newColors.B + ")");
            }
        }

        ledStrip.show();

        //Check to see if the animation needs to stop, or if this was the last step in the animation.
        if(animationRunning === false || scrollVars.currentStep++ == scrollVars.steps - 1) {
            logger.INFO("Scroll completed!");

            //This last fade is required because the last is not the correct target color, this is because of float rounding errors!
            ledStrip.color("rgb(" + scrollVars.newColors.R + "," + scrollVars.newColors.G + "," + scrollVars.newColors.B + ")");
            ledStrip.show();

            scrollVars.currentStep = 0;
            //Clear the animation interval.
            clearInterval(scrollVars.scrollInterval);
            //Call the callback function. (only when the animation is still running)
            if(animationRunning) {
                scrollVars.clbck();
            }
        }
    }
};

module.exports = LedStripUtils;