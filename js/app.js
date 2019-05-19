new Vue({
    el: '#app',
    data: {
        maxExtruderFeedrate: 5000,
        wasteBlockX: 50,
        wasteBlockY: 150,
        wasteBlockSize: 40,
        filamentParkingPosition: 140, // >= filamentCoolingPosition
        filamentCoolingPosition: 60, // >= 15
        coolingLength: 20,
        primeExtruders: true,
        bedWidth: 150,
        numberOfExtruders: 2,
        linesDistance: 1.2,
        retractionSize: 6, // greater than [retractionBackup] !!!
        retractionBackup: 2,
        loadFromBackupExtraDistance: 5,
        linesGoingBack: 2
    },
    computed: {
        wasteBlockHalfSize: function () {
            return +this.wasteBlockSize / 2;
        },
        wasteBlockCenterX: function () {
            return +this.wasteBlockX - this.wasteBlockHalfSize;
        },
        wasteBlockCenterY: function () {
            return +this.wasteBlockY + this.wasteBlockHalfSize;
        },
        halfFeedrate: function () {
            return this.max(1000, this.maxExtruderFeedrate / 2);
        }
    },
    methods: {
        format: function (num) {
            return Math.round(num * 100) / 100;
        },
        max: function (a, b) {
            return this.format(Math.max(a, b));
        },
        homeGcode: function () {
            return 'G28 ; home all\n';
        },
        extruderRelativePositioningGcode: function () {
            return 'M83 ; extruder relative positioning\n';
        },
        relativePositioningGcode: function () {
            return 'G91 ; relative positioning\n';
        },
        absolutePositioningGcode: function () {
            return 'G90 ; absolute positioning\n';
        },
        zeroExtruderLengthGcode: function () {
            return 'G92 E0 ; zero the extruded length\n';
        },
        moveFastGcode: function (position, comment) {
            return this.moveGcode(position, 8000, comment || 'move fast on position');
        },
        moveGcode: function (position, speed, comment) {
            return 'G1 ' + position + ' F' + this.format(speed) + ' ; ' + (comment || 'move on position') + '\n';
        },
        goOnZeroXYGcode: function () {
            return this.moveFastGcode('X0 Y0', 'move X/Y to 0');
        },
        moveFastOnCenterOfWasteBlockGcode: function () {
            return this.absolutePositioningGcode() +
                this.moveFastGcode('X' + this.format(this.wasteBlockCenterX) + ' Y' + this.format(this.wasteBlockCenterY), 'move ON the waste block');
        },
        loadFilamentFromParkingPositionGcode: function (movement, extraDistance) {
            movement = (movement || '') === '' ? '' : ' ' + movement;
            extraDistance = +extraDistance;

            return '\n;↓↓↓ Load from parking position ↓↓↓\n' +
                this.relativePositioningGcode() +
                this.moveGcode('E' + this.format(this.filamentParkingPosition - this.retractionBackup), this.max(1000, this.maxExtruderFeedrate), 'restore - ' + this.retractionBackup + 'mm') +
                this.moveGcode('E' + this.format(this.retractionBackup + extraDistance) + movement, 500, 'restore the rest (' + this.retractionBackup + ' mm)' + (extraDistance > 0 ? ' + ' + extraDistance + 'mm' : '')) +
                this.absolutePositioningGcode() +
                ';↑↑↑ Load from parking position ↑↑↑\n\n';
        },
        saveFilamentToParkingPositionGcode: function (ignoreZ) {
            let coolingLength = this.format(this.coolingLength / 2);
            let feedrate = this.max(1000, this.maxExtruderFeedrate);

            return '\n;↓↓↓ Cooling filament and saving filament to parking position ↓↓↓\n' +
                this.relativePositioningGcode() +
                this.moveGcode('E-' + this.format(this.retractionSize), feedrate, 'stage 1 of 3 stage retraction') +
                (ignoreZ === true ? '' : this.moveFastGcode('Z+2')) +
                this.moveGcode('E' + this.format(this.retractionSize - this.retractionBackup), feedrate / 2, 'stage 2 of 3 stage retraction, this keeps from producing "hair"') +
                this.moveGcode('E-' + this.format(this.filamentCoolingPosition - this.retractionBackup), feedrate, 'stage 3 of retraction, now cooling') +
                this.moveGcode('X+20 E' + coolingLength, 1000) +
                this.moveGcode('X-20 E-' + coolingLength, 1000) +
                this.moveGcode('X+20 E' + coolingLength, 1000) +
                this.moveGcode('X-20 E-' + coolingLength, 1000) +
                this.moveGcode('X+20 E' + coolingLength, 1000) +
                this.moveGcode('X-20 E-' + coolingLength, 1000) +
                this.moveGcode('E-' + this.format(this.filamentParkingPosition - this.filamentCoolingPosition), feedrate, 'parking filament') +
                this.absolutePositioningGcode() +
                ';↑↑↑ Cooling filament and saving filament to parking position ↑↑↑\n';
        },
        extrudeLineRightGcode: function () {
            return this.moveGcode('X60 E9.5', 1000, 'intro line first section to right') +
                this.moveGcode('X100 E12.5', 1000, 'intro line second section to right') +
                this.moveGcode('X150 E16.5', 1000, 'intro line last section to right');
        },
        extrudeLineLeftGcode: function () {
            return this.moveGcode('X100 E12.5', 1000, 'intro line first section to left') +
                this.moveGcode('X60 E9.5', 1000, 'intro line second section to left') +
                this.moveGcode('X10 E5', 1000, 'intro line last section to left') +
                this.moveGcode('X0 E1 Z{layer_height}', 500, 'intro line going back to zero');
        },
        introLineGcode: function () {
            if (!this.primeExtruders) {
                return '\n;;;; NO PRIME EXTRUDERS ;;;;\n';
            }

            if (+this.bedWidth < 150) {
                return '\n;;;; BED TOO SMALL ;;;\n';
            }

            let code = '', i, ii = this.linesDistance;

            for (i = +this.numberOfExtruders - 1; i >= 0; i--) {
                code += '\n;↓↓↓ Intro line T' + i + ' ↓↓↓\n' +
                    'T' + i + ' ; change tool\n' +
                    this.zeroExtruderLengthGcode() +
                    this.moveGcode('Y' + this.format(ii), 1000) +
                    this.moveFastGcode('Z{layer_height}') +
                    this.loadFilamentFromParkingPositionGcode('X+10', 0) +
                    this.extrudeLineRightGcode();

                if (i < this.linesGoingBack) {
                    ii += this.linesDistance;
                    code += this.moveGcode('Y' + this.format(ii), 1000);
                    code += this.extrudeLineLeftGcode();
                }

                if (i > 0) {
                    // save if not last/printing extruder
                    code += this.saveFilamentToParkingPositionGcode();
                } else {
                    code += this.moveGcode('E-' + this.format(this.retractionSize), this.halfFeedrate, 'release some presure');
                    code += this.moveFastGcode('Z+2');
                    code += this.moveGcode('E' + this.format(this.retractionSize - this.retractionBackup), this.halfFeedrate, 'restore with backup');
                }

                if (i > this.linesGoingBack - 1) {
                    code += this.moveFastGcode('X0');
                }

                code += this.zeroExtruderLengthGcode() +
                    ';↑↑↑ Intro line T' + i + ' ↑↑↑\n';

                ii += this.linesDistance;
            }

            return code;
        },

        // Actions
        startGcode: function () {
            return ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n' +
                ';↑↑↑ YOUR CODE ↑↑↑\n\n' +
                this.extruderRelativePositioningGcode() +
                this.moveFastGcode('Y0 X0 Z15', 'move on cleaning position') +
                this.introLineGcode() +
                ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;';
        },
        endGcode: function () {
            return ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n' +
                this.extruderRelativePositioningGcode() +
                this.relativePositioningGcode() +
                this.saveFilamentToParkingPositionGcode() +
                this.zeroExtruderLengthGcode() +
                this.absolutePositioningGcode() +
                this.goOnZeroXYGcode() +
                '\n' +
                ';↓↓↓ YOUR CODE ↓↓↓\n' +
                ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;';
        },
        startExtruderGcode: function (extruder) {
            let isOdd = +extruder % 2 > 0;
            let startPosition, movement;

            if (isOdd) {
                let wasteBlockX0 = this.format(+this.wasteBlockX - +this.wasteBlockSize);
                startPosition = this.moveGcode('X' + wasteBlockX0 + ' Y' + this.wasteBlockCenterY, 3000);
                movement = 'X+' + this.format(this.wasteBlockSize);
            } else {
                let wasteBlockY0 = this.format(+this.wasteBlockY + +this.wasteBlockSize);
                startPosition = this.moveGcode('X' + this.wasteBlockCenterX + ' Y' + wasteBlockY0, 3000);
                movement = 'Y-' + this.format(this.wasteBlockSize);
            }

            return ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n' +
                ';↑↑↑ YOUR CODE ↑↑↑\n' +
                '\n' +
                this.moveFastOnCenterOfWasteBlockGcode() +
                startPosition +
                this.relativePositioningGcode() +
                this.moveGcode('Z-2', 3600, 'touch the waste block') +
                this.loadFilamentFromParkingPositionGcode(movement, this.loadFromBackupExtraDistance) +
                this.zeroExtruderLengthGcode() +
                ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;';
        },
        endExtruderGcode: function () {
            return ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n' +
                this.extruderRelativePositioningGcode() +
                this.relativePositioningGcode() +
                this.moveGcode('E-' + this.format(this.retractionBackup) + ' X-1 Y-1', this.halfFeedrate, 'release some presure and move') +
                this.moveGcode('Z+2 E-' + this.format(this.retractionSize - this.retractionBackup), this.halfFeedrate, 'release even more presure') +
                this.moveFastOnCenterOfWasteBlockGcode() +
                this.relativePositioningGcode() +
                this.moveGcode('Z-2 X+10 E' + this.format(this.retractionSize), this.halfFeedrate, 'restore filament') +
                this.moveGcode('Y+2', this.halfFeedrate) +
                this.moveGcode('X-10', this.halfFeedrate) +
                this.moveGcode('Y-2', this.halfFeedrate) +
                this.saveFilamentToParkingPositionGcode() +
                this.zeroExtruderLengthGcode() +
                this.absolutePositioningGcode() +
                '\n' +
                ';↓↓↓ YOUR CODE ↓↓↓\n' +
                ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;';
        },
        prepareGcode: function () {
            if (!this.primeExtruders) {
                return ';;;; NO PRIME EXTRUDERS ;;;;';
            }

            let code = '', i;

            for (i = 0; i < +this.numberOfExtruders; i++) {
                code += '\n;↓↓↓ Prepare T' + i + ' ↓↓↓\n' +
                    'T' + i + ' ; change tool\n' +
                    this.zeroExtruderLengthGcode() +
                    this.loadFilamentFromParkingPositionGcode('', 0) +
                    this.moveGcode('E30', 200, 'extrude another 30 mm, just to be sure') +
                    this.saveFilamentToParkingPositionGcode(true) +
                    this.zeroExtruderLengthGcode() +
                    ';↑↑↑ Prepare T' + i + ' ↑↑↑\n';
            }

            return this.extruderRelativePositioningGcode() +
                this.homeGcode() +
                this.goOnZeroXYGcode() +
                this.moveFastGcode('Z80', 'move on cleaning position') +
                code;
        },
    }
});

// TODO: Create more fancy movements during intro lines
// TODO: Create G-code to load/unload filament
