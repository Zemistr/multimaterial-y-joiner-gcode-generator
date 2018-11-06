new Vue({
    el: '#app',
    data: {
        maxExtruderFeedrate: 10000,
        wasteBlockX: 50,
        wasteBlockY: 150,
        wasteBlockSize: 32,
        filamentParkingPosition: 140,
        coolingLength: 10,
    },
    computed: {
        startGcode: function () {
            return ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n' +
                ';↑↑↑ YOUR CODE ↑↑↑\n' +
                '\n' +
                'M83 ; extruder relative positioning\n' +
                'G1 Y0 X0 Z15 F6000;move on cleaning position\n' +
                'G1 E' + this.format(this.filamentParkingPosition - 10) + ' F' + this.max(1000, this.maxExtruderFeedrate) + ' ; undo storage position\n' +
                'G1 E10 F300 ; extrude another 10mm to finish undo storage\n' +
                'G1 E40 F150 ; extrude 40mm to clean the nozzle\n' +
                'G1 E-2 F500 ; retract 2 mm\n' +
                'G92 E0 ; zero the extruded length again\n' +
                ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;';
        },
        endGcode: function () {
            return ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n' +
                'M104 S0 ; extruder heater off\n' +
                'M140 S0 ; heated bed heater off (if you have it)\n' +
                'M83 ; extruder relative positioning\n' +
                'G91 ; relative positioning\n' +
                'G1 E-1 F300 ; retract the filament a bit before lifting the nozzle, to release some of the pressure\n' +
                'G1 E-5 Z+0.5 X-20 Y-20 ; move Z up a bit and retract filament even more\n' +
                'G1 E-' + this.format(this.filamentParkingPosition - 6) + ' F' + this.max(1000, this.maxExtruderFeedrate) + ' ; retract the rest\n' +
                this.coolingGcode +
                'G92 E0 ; zero the extruded length again\n' +
                'G90 ; absolute positioning\n' +
                'G28 X0 Y0 ; move X/Y to min endstops, so the head is out of the way\n' +
                '\n' +
                ';↓↓↓ YOUR CODE ↓↓↓\n' +
                ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;';
        },
        startExtruderGcode: function () {
            return ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n' +
                ';↑↑↑ YOUR CODE ↑↑↑\n' +
                '\n' +
                'M83 ; extruder relative positioning\n' +
                'G90 ; absolute positioning\n' +
                'G1 X' + this.format(this.wasteBlockX - (this.wasteBlockSize * 0.6)) + ' Y' + this.format(this.wasteBlockY + (this.wasteBlockSize * 0.6)) + ' F3600 ; move ON the waste block\n' +
                'G91 ; relative positioning\n' +
                'G1 Z-2 F3600 ; touch the waste block\n' +
                'G1 E' + this.format(this.filamentParkingPosition - 15) + ' F' + this.max(1000, this.maxExtruderFeedrate) + ' ; undo storage position\n' +
                'G1 E5 F500 ; extrude another 5mm\n' +
                'G1 E7 F200 ; extrude last 10 - 3 mm to finish safe undo storage\n' +
                'G92 E0 ; zero the extruded length again\n' +
                'G90 ; absolute positioning\n' +
                ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;';
        },
        endExtruderGcode: function () {
            return ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n' +
                'M83 ; extruder relative positioning\n' +
                'G91 ; relative positioning\n' +
                'G1 E-7 F' + this.max(1000, this.maxExtruderFeedrate) + ' ; stage 1 of 3 stage retraction\n' +
                'G1 X+0.5 Y+0.5 F10000 ; move/clean nozzle little bit\n' +
                'G1 Z+2 F10000 ; move up far from object\n' +
                'G1 E4 F' + this.max(1000, this.maxExtruderFeedrate) + ' ; stage 2 of 3 stage retraction\n' +
                'G1 E-' + this.format(this.filamentParkingPosition) + ' F' + this.max(1000, this.maxExtruderFeedrate) + ' ; stage 3, this keeps from producing "hair"\n' +
                this.coolingGcode +
                'G92 E0 ; zero the extruded length again\n' +
                'G90 ; absolute positioning\n' +
                '\n' +
                ';↓↓↓ YOUR CODE ↓↓↓\n' +
                ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;';
        },
        coolingGcode: function () {
            let length = this.format(this.coolingLength / 2);

            if (length <= 0) {
                return '';
            }

            return '\n;↓↓↓ Cooling filament ↓↓↓\n' +
                'G1 E' + length + ' F1500\n' +
                'G1 E-' + length + ' F1600\n' +
                'G1 E' + length + ' F1700\n' +
                'G1 E-' + length + ' F1800\n' +
                'G1 E' + length + ' F1900\n' +
                'G1 E-' + length + ' F2000\n' +
                'G1 E' + length + ' F2100\n' +
                'G1 E-' + length + ' F2200\n' +
                ';↑↑↑ Cooling filament ↑↑↑\n\n';
        }
    },
    methods: {
        format: function (num) {
            return Math.round(num * 100) / 100;
        },
        max: function (a, b) {
            return this.format(Math.max(a, b));
        }
    }
});
