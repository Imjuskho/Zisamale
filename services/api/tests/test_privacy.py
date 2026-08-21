from app.privacy import cloud_gps, coarsen_coordinate


def test_coarsen_coordinate_ta_scale():
    assert coarsen_coordinate(-16.53281) == -16.53
    assert coarsen_coordinate(None) is None


def test_cloud_gps_pair():
    assert cloud_gps(-16.53281, 35.14199) == (-16.53, 35.14)
